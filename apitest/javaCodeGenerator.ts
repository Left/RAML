/// <reference path="./node.d.ts" />
/// <reference path="./raml003parser.d.ts" />
/// <reference path="./raml003factory.d.ts" />
/// <reference path="./../highLevelImpl.d.ts" />
/// <reference path="./../lowLevelAST.d.ts" />

import {Api} from "./raml003parser";
import {DataElement} from "./raml003parser";
import {AnnotationRef} from "./raml003parser";
import {StructuredValue} from "./highLevelImpl";
import {Stream} from "stream";
import {Resource} from "./raml003parser";

// This assigns global.RAML
require('e:/git/raml-js-parser-2/src/bundle.js');

import fs = require("fs");
import os = require("os");
import path = require("path");
var fName = path.resolve(__dirname + "/../raml_samples/database.raml");

const ramlInterface = (<any>global).RAML;

const api:Api = ramlInterface.loadApi(fName).getOrElse(null);

const getTypeFromName = function(name:string): any {
    return api.types().filter((t) => t.name() === name)[0];
};

interface TextStream {
    write(str: string): void;
    close(): void;
}

interface OutFolder {
    createOutStream(name: string[]): TextStream;
}

// type Block = () => (((Block|string)[]) | string[] | Block[]);
interface Block {
    (): (Block|string)[];
}

const printBlock = function(tab: string, b: Block, lvl?: number): string[] {
    lvl = lvl || 0;
    var ret: string[] = [];
    b().forEach((l: Block|string) => {
       if (typeof l === "string") {
           ret.push(Array(lvl+1).join(tab) + <string>l);
       } else {
           ret = ret.concat(printBlock(tab, <Block>l, lvl+1));
       }
    });

    return ret;
};

const uppercaseFirst = (str: string) : string => {
    return str.substr(0, 1).toUpperCase() + str.substr(1);
};

const getAnnotation = (a): { name: string, value: string} => {
    const s = <StructuredValue>(<any>((<AnnotationRef>a).value()));
    var iLowLevelASTNode = s.lowLevel();

    return { name: s.valueName(), value: iLowLevelASTNode.value()};
};

function toJavaTypeImpl(type:string, onObject:(typeName:string) => void): string {
    if (type === "string") {
        return "String";
    } else if (type === "number") {
        return "Long"; // TODO: map other types here
    } else if (type === "boolean") {
        return "boolean";
    } else {
        onObject(type);
        return type;
    }
}

const joinResouces = (r:Resource[], parentUrl:string[], processor:(fullUrl:string[], r:Resource) => void) => {
    r.forEach((res) => {
        const url = res.relativeUri().value().split("/").filter(el => el !== "");

        processor(parentUrl.concat(url), res);
        joinResouces(res.resources(), parentUrl.concat(url), processor);
    });
};

/**
 *
 **/
class JavaClassesGenerator {
    private packageAsArray: string[];
    private generatedTypes: string[] = [];

    constructor(private api:Api, private packageName:string) {
        this.packageAsArray = this.packageName.split(".");
    }

    processWebXml(oldContent:string):string  {
        // TODO: Use some real XML parser to work with XML file

        const lines = oldContent.split(/\r\n|\r|\n/);

        const start = lines.map(s => s.trim()).indexOf("<!-- [START Objectify] -->");
        const end = lines.map(s => s.trim()).indexOf("<!-- [END Objectify] -->");

        if (start > 0 && end > start) {
            // console.log(lines.slice(start + 1, end));

            const xmlBlock = (obj:{[name: string]: any}):Block => {
                var res = [];
                for (const n in obj) {
                    if ((typeof obj[n]) === 'string') {
                        res.push("<" + n + ">" + obj[n] + "</" + n + ">");
                    } else {
                        res.push("<" + n + ">");
                        res = res.concat(xmlBlock(obj[n]));
                        res.push("</" + n + ">");
                    }
                }
                return () => res;
            };

            const replacementLines = printBlock("    ",
                xmlBlock({
                    "filter": {
                        "filter-name": "ObjectifyFilter",
                        "filter-class": "com.googlecode.objectify.ObjectifyFilter"
                    },
                    "filter-mapping": {
                        "filter-name": "ObjectifyFilter",
                        "url-pattern": "/*"
                    },
                    "listener": {
                        "listener-class": this.packageAsArray.concat(["OfyHelper"]).join(".")
                    }
                }), 1);

            return lines.slice(0, start+1)
                .concat(replacementLines)
                .concat(lines.slice(end)).join("\n");
        }

        return oldContent;
    }

    private generateOfyHelper(stream: TextStream):void {
        const block:Block = () => {
            var imports:{ [typeName: string]:any } = {
                "com.googlecode.objectify.Objectify": "",
                "com.googlecode.objectify.ObjectifyFactory": "",
                "com.googlecode.objectify.ObjectifyService": "",
                "javax.servlet.ServletContextListener": "",
                "javax.servlet.ServletContextEvent": ""
            };

            return this.generatePackageHeader()
              .concat(Object.keys(
                  imports).concat(
                      this.generatedTypes).map((type) => "import " + type + ";"))
              .concat(["", ""])
              .concat([
                  "public class OfyHelper implements ServletContextListener {",
                  () => [
                      "public static void register() {",
                      () => this.generatedTypes.map(cl => "ObjectifyService.register(" + cl + ".class);"),
                      "}"
                  ],
                  "",
                  () => [
                      "public void contextInitialized(ServletContextEvent event) {",
                      () => [
                          "// This will be invoked as part of a warmup request, or the first user",
                          "// request if no warmup request was invoked.",
                          "register();"
                      ],
                      "}"
                  ],
                  "",
                  () => [
                      "public void contextDestroyed(ServletContextEvent event) {",
                      () => [
                          "// App Engine does not currently invoke this method."
                      ],
                      "}"
                  ],
                  "}"
              ]);
        };

        stream.write(printBlock("\t", block).join("\n"));
        stream.close();
    }

    mapTypes(out:OutFolder): void {
        api.types().forEach((type) => {
            const block:Block = () => {
                var imports:{ [typeName: string]:any } = {
                    "com.googlecode.objectify.annotation.Entity": "",
                    "com.googlecode.objectify.annotation.Id": "",
                    "com.googlecode.objectify.annotation.Index": "",
                    "com.googlecode.objectify.annotation.Parent": "",
                    "com.googlecode.objectify.Key": ""
                };

                const toJavaType = function (type:string) {
                    return toJavaTypeImpl(type, (type) => {
                        imports[this.packageAsArray.concat([type]).join(".")] = "";
                    });
                };

                // Add this type to list of all generated ones
                this.generatedTypes.push(this.packageAsArray.concat([type.name()]).join("."));

                const props = type.properties();

                var wholeClassContent = [];

                wholeClassContent.push("// Properties:");

                props.forEach((prop) => {
                    prop.annotations().forEach(a => {
                        const ann = getAnnotation(a);
                        if (ann.name === "orm.id") {
                            wholeClassContent.push("@Id");
                        }
                    });

                    wholeClassContent = wholeClassContent.concat([
                        "private " + toJavaType(prop.type()[0]) + " " + prop.name() + ";"
                    ]);
                });

                // Getters
                wholeClassContent.push("");
                wholeClassContent.push("// Getters:");

                props.forEach((prop) => {
                    wholeClassContent = wholeClassContent.concat([
                        "public " + toJavaType(prop.type()[0]) + " get" + uppercaseFirst(prop.name()) + "() { ",
                        () => ["return " + prop.name() + ";"],
                        "};"]);
                });

                // Setters
                wholeClassContent.push("");
                wholeClassContent.push("// Setters:");

                props.forEach((prop) => {
                    wholeClassContent = wholeClassContent.concat([
                        "public void set" + uppercaseFirst(prop.name()) + "(" + toJavaType(prop.type()[0]) + " " + prop.name() + ") { ",
                        () => ["this." + prop.name() + "=" + prop.name() + ";"],
                        "};"
                    ]);
                });

                const classDeclaration = [
                    "/**",
                    " * " + (type.displayName() || ""),
                    " */",
                    "@Entity",
                    "public class " + type.name() + "{",
                    () => wholeClassContent,
                    "}"
                ];

                return this.generatePackageHeader()
                    .concat(Object.keys(imports).map((type) => "import " + type + ";"))
                    .concat([""])
                    .concat(classDeclaration);
            };

            const stream = out.createOutStream(this.packageAsArray.concat([type.name() + ".java"]));
            stream.write(printBlock("\t", block).join("\n"));
            stream.close();
        });

        joinResouces(api.resources(), [], (fullUrl, r) => {
            const urlParams:{[paramName: string]: {[attrName: string]: string}} = {};
            var joinType;

            r.uriParameters().forEach(p => {
                urlParams[p.name()] = {};
                p.annotations().forEach(a => {
                    const ann = getAnnotation(a);

                    urlParams[p.name()][ann.name] = ann.value;
                });
            });

            r.methods().forEach((method) => {
                method.annotations().forEach(a => {
                    const annotation = getAnnotation(a);
                    const processors = {
                        "orm.create.request": (typeName) => {
                            console.log("CREATE REQ", typeName);
                        },
                        "orm.delete.request": (typeName) => {
                            console.log("DELETE REQ", typeName);
                        },
                        "orm.list.request": (typeName) => {
                            console.log("LIST REQ", typeName);
                        },
                        "orm.get.request": (typeName) => {
                            console.log("GET REQ", typeName);
                        }
                    };
                    if (annotation.name in processors) {
                        processors[annotation.name](annotation.value);
                    }
                });

                console.log("============= ", method.method());
                /*
                 const methodLowCase = method.method().toLowerCase();
                 if (methodLowCase === 'post' || methodLowCase === 'get') {
                 // It could be "create" method
                 method.body().forEach((kk) => {
                 kk.type().forEach(type => {
                 if (type.toLowerCase() === fullUrl[0] && methodLowCase === 'post') {
                 console.log("FOUND CREATE METHOD for type", type);
                 }

                 console.log(type.toLowerCase(), methodLowCase);
                 });
                 });
                 } else if (methodLowCase === 'delete' && joinType) {
                 console.log("FOUND DELETE METHOD for type", joinType);
                 // Delete the type
                 } else if (methodLowCase === 'get' && joinType) {
                 console.log("FOUND GET METHOD for type", joinType);
                 }
                 */
                method.responses().forEach((resp) => {
                    console.log("\t", resp.code().value());

                    resp.body().forEach((body) => {
                        console.log("\t\t", body.type().join(","));
                    })
                });
            });
        });

        this.generateOfyHelper(out.createOutStream(this.packageAsArray.concat(["OfyHelper.java"])));
    };

    private generatePackageHeader(): (Block|string)[] {
        return [
            "// This file is generated.",
            "// please don't edit it manually.",
            "",
            "package " + this.packageAsArray.join(".") + ";",
            () => [""],
            ""
        ];
    };
}

// const tempFolder = path.join(os.tmpdir(), "jdo_output");
const gen = new JavaClassesGenerator(api, "com.example.dbotest.db");

const baseGaeFolder = "/../raml_samples/gae/src/main/";
const javaFilesFolder = path.join(__dirname, baseGaeFolder + "java/");
console.log("Saving .java files to ", javaFilesFolder);

gen.mapTypes({
    createOutStream(name: string[]) {
        const file = path.join(javaFilesFolder, path.join.apply(null, name));

        const checkExistance = function(dir: string) {
            if (!fs.existsSync(dir)) {
                checkExistance(path.dirname(dir));
                fs.mkdirSync(dir);
            }
        };
        checkExistance(path.dirname(file));

        const strm = fs.createWriteStream(file, { encoding: "utf8" });
        return {
            write(str: string) {
                strm.write(str);
            },
            close() {
                strm.close();
            }
        };
    }
});

const webXmlFileFolder = path.join(__dirname, baseGaeFolder + "webapp/WEB-INF/web.xml");
const resWebXmlFile = gen.processWebXml(fs.readFileSync(webXmlFileFolder).toString("utf8"));
fs.writeFileSync(webXmlFileFolder, new Buffer(resWebXmlFile, "utf8"));