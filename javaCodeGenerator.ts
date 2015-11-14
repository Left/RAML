/// <reference path="./node.d.ts" />

/// <reference path="node_modules/raml-1-0-parser/parser-typings/raml1Parser.d.ts" />

// This assigns global.RAML
import raml = require("raml-1-0-parser");

import fs = require("fs");
import os = require("os");
import path = require("path");

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
    const s = <raml.StructuredValue>(<any>((<raml.AnnotationRef>a).value()));
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

const joinResouces = (r:raml.Resource[], parentUrl:string[], processor:(fullUrl:string[], r:raml.Resource) => void) => {
    r.forEach((res) => {
        const url = res.relativeUri().value().split("/").filter(el => el !== "");

        processor(parentUrl.concat(url), res);
        joinResouces(res.resources(), parentUrl.concat(url), processor);
    });
};

interface Servlet {
    urlPattern(): string;
    name(): string;
    className(): string;
};

/**
 *
 **/
class JavaClassesGenerator {
    private packageAsArray: string[];
    private generatedTypes: string[] = [];

    private servlets: Servlet[] = [];

    constructor(private api:raml.Api, private packageName:string) {
        this.packageAsArray = this.packageName.split(".");
    }

    processWebXml(oldContent:string):string  {
        // TODO: Use some real XML parser to work with XML file

        const lines = oldContent.split(/\r\n|\r|\n/);

        const start = lines.map(s => s.trim()).indexOf("<!-- [START Objectify] -->");
        const end = lines.map(s => s.trim()).indexOf("<!-- [END Objectify] -->");

        if (start > 0 && end > start) {
            // console.log(lines.slice(start + 1, end));

            const xmlBlock = (objs: any[]):Block => {
                var res = [];
                objs.forEach((obj) => {
                    for (const n in obj) {
                        if ((typeof obj[n]) === 'string') {
                            res.push("<" + n + ">" + obj[n] + "</" + n + ">");
                        } else {
                            res.push("<" + n + ">");
                            res = res.concat(xmlBlock([obj[n]]));
                            res.push("</" + n + ">");
                        }
                    }
                });
                return () => res;
            };

            const replacementLines = printBlock("    ",
                xmlBlock((<any[]>[{
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
                }]).concat(this.servlets.map((servlet) => {
                    return {
                        "servlet": {
                            "servlet-name": servlet.name(),
                            "servlet-class": servlet.className()
                        },
                        "servlet-mapping": {
                            "servlet-name": servlet.name(),
                            "url-pattern": servlet.urlPattern()
                        }
                    };
                }))), 1);

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

        this.writeBlockToStream(stream, block);
    }

    private writeBlockToStream(stream: TextStream, block: Block) {
        stream.write(printBlock("\t", block).join("\n"));
        stream.close();
    };

    mapTypes(out:OutFolder): void {
        this.api.types().forEach((type) => {
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

            this.writeBlockToStream(
                out.createOutStream(this.packageAsArray.concat([type.name() + ".java"])),
                block);
        });

        joinResouces(this.api.resources(), [], (fullUrl, r) => {
            const urlParams:{[paramName: string]: {[attrName: string]: string}} = {};
            var joinType;

            r.uriParameters().forEach(p => {
                urlParams[p.name()] = {};
                p.annotations().forEach(a => {
                    const ann = getAnnotation(a);

                    urlParams[p.name()][ann.name] = ann.value;
                });
            });

            const servletMethods = [];

            r.methods().forEach((method) => {
                method.annotations().forEach(a => {
                    const annotation = getAnnotation(a);
                    const processors = {
                        "orm.create.request": (typeName) => {
                            servletMethods.push(method.method());
                        },
                        "orm.delete.request": (typeName) => {
                            servletMethods.push(method.method());
                        },
                        "orm.list.request": (typeName) => {
                            servletMethods.push(method.method());
                        },
                        "orm.get.request": (typeName) => {
                            servletMethods.push(method.method());
                        }
                    };
                    if (annotation.name in processors) {
                        processors[annotation.name](annotation.value);
                    }
                });

                method.responses().forEach((resp) => {
                    console.log("\t", resp.code().value());

                    resp.body().forEach((body) => {
                        console.log("\t\t", body.type().join(","));
                    })
                });
            });

            if (servletMethods.length > 0) {
                const javaClassName = "Servlet" + (this.servlets.length + 1);
                this.servlets.push({
                    urlPattern() {
                        return "/" + fullUrl.join("/");
                    },
                    name() {
                        return javaClassName;
                    },
                    className() {
                        return javaClassName;
                    }
                });

                const imports = [
                    "java.io.IOException",
                    "java.util.Date",
                    "javax.servlet.http.HttpServlet",
                    "javax.servlet.http.HttpServletRequest",
                    "javax.servlet.http.HttpServletResponse",
                    "java.io.InputStream",
                    "java.io.InputStreamReader",
                    "com.googlecode.objectify.ObjectifyService",
                    "com.google.gson.Gson"
                ];

                // Generate servlet's code here
                const block = this.generatePackageHeader()
                    .concat(imports.map(type => "import " + type + ";"))
                    .concat([
                        "",
                        "public class " + javaClassName + " extends HttpServlet {",
                        () => Array.prototype.concat.apply([], servletMethods.map(
                            (method) => {
                                return [
                                    "@Override",
                                    "public void do" + uppercaseFirst(method) + "(HttpServletRequest req, HttpServletResponse resp) throws IOException {",
                                    () => Array.prototype.concat.apply([], [
                                        [
                                            "// Process request here",
                                        ],
                                        (method == "post") ?
                                        [
                                            "// here we should process POST",
                                            "InputStream strm = req.getInputStream();",
                                            "Person person = new Gson().fromJson(new InputStreamReader(strm), Person.class);",
                                            "",
                                            "ObjectifyService.ofy().save().entity(person).now();"
                                        ] :
                                        []
                                    ]),
                                    "}",
                                    ""
                                ];
                            }
                        )),
                        "}"
                    ])


                // write servlet's code to stream
                this.writeBlockToStream(
                    out.createOutStream(this.packageAsArray.concat([javaClassName + ".java"])),
                    () => block);
            }

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

    private getTypeFromName(name:string): any {
       return this.api.types().filter((t) => t.name() === name)[0];
    };

}

// Source file
var fName = path.resolve(__dirname + "/raml_samples/database.raml");

const api:raml.Api = raml.loadApi(fName).getOrThrow();


// const tempFolder = path.join(os.tmpdir(), "jdo_output");
const gen = new JavaClassesGenerator(api, "com.example.dbotest.db");

const baseGaeFolder = "/raml_samples/gae/src/main/";
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