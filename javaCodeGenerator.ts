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
}

interface TypeToSerialize {
    shortName: string;
    fullName: string;
    idFieldName: string;
    idFieldType: string;
};

function forEachValue<T>(o: { [index: string]: T }, p: (k: string, v: T) => void): void {
    Object.keys(o).forEach(k => {
       if (o.hasOwnProperty(k)) {
           p(k, o[k]);
       }
    });
}

function mapValues<T, O>(o: { [index: string]: T }, p: (k: string, v: T) => O): O[] {
    return Array.prototype.concat.apply([],
        Object.keys(o).map(k => {
            if (o.hasOwnProperty(k)) {
                return [ p(k, o[k]) ];
            } else {
                return [];
            }
        })
    );
}

/**
 *
 **/
class JavaClassesGenerator {
    private packageAsArray: string[];

    private servlets: Servlet[] = [];
    private typesToSerialize: { [name: string]: TypeToSerialize } = {};

    static URL_PARAM_TO_STAR = s => s.replace(/\{[^}]*\}/gi, "*");

    constructor(private api:raml.Api, private packageName:string) {
        this.packageAsArray = this.packageName.split(".");
    }

    public processWebXml(oldContent:string):string  {
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
                        if (obj.hasOwnProperty(n)) {
                            //noinspection JSUnfilteredForInLoop
                            if ((typeof obj[n]) === 'string') {
                                //noinspection JSUnfilteredForInLoop
                                res.push("<" + n + ">" + obj[n] + "</" + n + ">");
                            } else {
                                res.push("<" + n + ">");
                                res = res.concat(xmlBlock([obj[n]]));
                                res.push("</" + n + ">");
                            }
                        }
                    }
                });
                return () => res;
            };

            // Let's sort servlets in a special order
            // to avoid confusing between /some and /some/*
            this.servlets = this.servlets.sort((a, b) => {
                return b.urlPattern().localeCompare(a.urlPattern());
            });


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
                            "servlet-class": this.packageAsArray.concat([servlet.className()]).join(".")
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
            var imports = [
                "com.googlecode.objectify.Objectify",
                "com.googlecode.objectify.ObjectifyFactory",
                "com.googlecode.objectify.ObjectifyService",
                "javax.servlet.ServletContextListener",
                "javax.servlet.ServletContextEvent"
            ];

            return this.generatePackageHeader(imports.concat(
                mapValues(this.typesToSerialize,
                    (typeName, type) => type.fullName)))
              .concat([
                  "public class OfyHelper implements ServletContextListener {",
                  () => [
                      "public static void register() {",
                      () => mapValues(this.typesToSerialize,
                          (typeName, type) => "ObjectifyService.register(" + type.fullName + ".class);"),
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

        JavaClassesGenerator.writeBlockToStream(stream, block);
    }

    private static writeBlockToStream(stream: TextStream, block: Block) {
        stream.write(printBlock("\t", block).join("\n"));
        stream.close();
    };

    public mapTypes(out:OutFolder): void {
        this.api.types().forEach((type) => {
            const block:Block = () => {
                var imports = [
                    "com.googlecode.objectify.annotation.Entity",
                    "com.googlecode.objectify.annotation.Id",
                    "com.googlecode.objectify.annotation.Index",
                    "com.googlecode.objectify.annotation.Parent",
                    "com.googlecode.objectify.Key"
                ];

                const toJavaType = function (type:string) {
                    return toJavaTypeImpl(type, (type) => {
                        imports[this.packageAsArray.concat([type]).join(".")] = "";
                    });
                };

                const props = type.properties();

                var wholeClassContent = [];

                wholeClassContent.push("// Properties:");

                var idFieldName: string;
                var idFieldType: string;

                props.forEach((prop) => {
                    prop.annotations().forEach(a => {
                        const ann = getAnnotation(a);
                        if (ann.name === "orm.id") {
                            wholeClassContent.push("@Id");
                            idFieldName = prop.name();
                            idFieldType = prop.type()[0];
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

                // Add this type to list of all generated ones
                const typeObject: TypeToSerialize = {
                    shortName: type.name(),
                    fullName: this.packageAsArray.concat([type.name()]).join("."),
                    idFieldName: idFieldName,
                    idFieldType: idFieldType,
                };
                this.typesToSerialize[typeObject.shortName] = typeObject;

                return this.generatePackageHeader(imports)
                    .concat([""])
                    .concat(classDeclaration);
            };

            JavaClassesGenerator.writeBlockToStream(
                out.createOutStream(this.packageAsArray.concat([type.name() + ".java"])),
                block);
        });

        joinResouces(this.api.resources(), [], (fullUrl, r) => {
            const urlParams:{[paramName: string]: {[attrName: string]: string}} = {};

            r.uriParameters().forEach(p => {
                urlParams[p.name()] = {};
                p.annotations().forEach(a => {
                    const ann = getAnnotation(a);

                    urlParams[p.name()][ann.name] = ann.value;
                });
            });

            interface ServletMethod {
                httpMethod: string;
                type: string;
            }

            const servletMethods: { [annotationName: string]: ServletMethod } = {};

            r.methods().forEach((method) => {
                method.annotations().forEach(a => {
                    const annotation = getAnnotation(a);
                    const defProcessor = (typeName) => {
                        servletMethods[annotation.name] = {
                            httpMethod: method.method(),
                            type: typeName
                        };
                    };

                    const processors = {
                        "orm.create.request": defProcessor,
                        "orm.delete.request": defProcessor,
                        "orm.list.request": defProcessor,
                        "orm.get.request": defProcessor
                    };
                    if (annotation.name in processors) {
                        processors[annotation.name](annotation.value);
                    }
                });

                /*
                method.responses().forEach((resp) => {
                    console.log("\t", resp.code().value());

                    resp.body().forEach((body) => {
                        console.log("\t\t", body.type().join(","));
                    })
                });
                */
            });


            if (Object.keys(servletMethods).length > 0) {
                const javaClassName = "Servlet" + (this.servlets.length + 1);
                this.servlets.push({
                    urlPattern() {
                        //
                        return "/" + fullUrl.map(JavaClassesGenerator.URL_PARAM_TO_STAR).join("/");
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
                    "java.io.OutputStream",
                    "java.io.InputStreamReader",
                    "java.io.OutputStreamWriter",
                    "java.util.Collection",
                    "java.util.regex.Pattern",
                    "java.util.regex.Matcher",
                    "com.googlecode.objectify.ObjectifyService",
                    "com.google.gson.Gson"
                ];

                // Generate servlet's code here
                const block = this.generatePackageHeader(imports)
                    .concat([
                        "",
                        "public class " + javaClassName + " extends HttpServlet {",
                        () => Array.prototype.concat.apply([], Object.keys(servletMethods).map(
                            (method) => {
                                const httpMethod = servletMethods[method].httpMethod;
                                const className = servletMethods[method].type;

                                const methodValue = (({
                                    "orm.create.request": () => [
                                        "// here we should process POST",
                                        "InputStream strm = req.getInputStream();",
                                        className + " obj = new Gson().fromJson(new InputStreamReader(strm), " + className + ".class);",
                                        "",
                                        "ObjectifyService.ofy().save().entity(obj).now();"
                                    ],
                                    "orm.list.request": () => [
                                        "// here we should process GET",
                                        "Collection<" + className + "> result = ObjectifyService.ofy().load().type(" + className + ".class).list();",
                                        "resp.setStatus(200);",
                                        "resp.setContentType(\"application/json\");",
                                        "",
                                        "new Gson().toJson(result, resp.getWriter());",
                                        "resp.flushBuffer();"
                                    ],
                                    "orm.delete.request": () => {
                                        const patternAndMap = JavaClassesGenerator.urlParsePattern(fullUrl);

                                        return [
                                            //"// here we should process DELETE",
                                            "Pattern pattern = Pattern.compile(\"" +
                                                patternAndMap[0]+ "\");",
                                            "Matcher m = pattern.matcher(req.getRequestURI());",
                                            "if (m.find()) {",
                                            () => {
                                                var className;
                                                var urlParName;
                                                Object.keys(urlParams).forEach(urlPar => {
                                                    Object.keys(urlParams[urlPar]).forEach( annName => {
                                                        if (annName === "orm.join") {
                                                            className = urlParams[urlPar][annName];
                                                            urlParName = urlPar;
                                                        }
                                                    });
                                                });

                                                if (className && urlParName) {
                                                    const classDesc = this.typesToSerialize[className];
                                                    const idDecl: string[] = [];
                                                    const idType = toJavaTypeImpl(classDesc.idFieldType, ()=>{});

                                                    if (idType === "String") {
                                                        idDecl.push("String id = m.group(" + patternAndMap[1][urlParName] + ");");
                                                    } else {
                                                        idDecl.push(idType + " id = " +
                                                            idType + ".decode(m.group(" + patternAndMap[1][urlParName] + "));");
                                                    }

                                                    return idDecl.concat([
                                                        "ObjectifyService.ofy().delete().type(" +
                                                            classDesc.shortName + ".class).id(id).now();"
                                                    ]);
                                                } else {
                                                    return ["// No id for class to delete"];
                                                }
                                            },
                                            "}"
                                            //"Collection<" + className + "> result = ObjectifyService.ofy().load().type(" +
                                            //    className + ".class).ids(req. ).list();",
                                            //"ObjectifyService.ofy().delete(result).now();",
                                            //
                                            //"resp.setStatus(200);",
                                            //"resp.setContentType(\"application/json\");",
                                            //"",
                                            //"new Gson().toJson(result, resp.getWriter());",
                                            //"resp.flushBuffer();"
                                        ]
                                    }
                                }[method]) || (() => [])) ();

                                return [
                                    "@Override",
                                    "public void do" + uppercaseFirst(httpMethod) + "(HttpServletRequest req, HttpServletResponse resp) throws IOException {",
                                    () => Array.prototype.concat.apply([], [
                                        [
                                            "// Generated code, do not change",
                                        ],
                                        methodValue
                                    ]),
                                    "}",
                                    ""
                                ];
                            }
                        )),
                        "}"
                    ]);


                // write servlet's code to stream
                JavaClassesGenerator.writeBlockToStream(
                    out.createOutStream(this.packageAsArray.concat([javaClassName + ".java"])),
                    () => block);
            }

        });

        this.generateOfyHelper(out.createOutStream(this.packageAsArray.concat(["OfyHelper.java"])));
    };

    public static urlParsePattern(url: string[]): [string, {[parName: string]: number}] {
        const map:{[parName: string]: number} = {};
        var index = 1;
        const regexp = "^/" + url.map(val => val.replace(/{([^}]*)}/gi,
            (s, inner) => {
                map[inner] = index++;
                return "(.*" + ")";
            })).join("/");
        return [regexp, map];
    }

    private generatePackageHeader(imports: string[]): (Block|string)[] {
        return [
            "// This file is generated.",
            "// please don't edit it manually.",
            "",
            "package " + this.packageAsArray.join(".") + ";",
            () => [""],
            "" ]
        .concat(imports.map(i => "import " + i + ";"))
        .concat([
            "",
            ""]);
    };

    //private getTypeFromName(name:string): any {
    //   return this.api.types().filter((t) => t.name() === name)[0];
    //};
}

//console.log(mapValues( { a: 1, b: 2, c: 3}, (k, v) => k + " => " + (v + 1)).join(","));
//return;

//const pat = JavaClassesGenerator.urlParsePattern(["person", "{personName}"]);
//console.log(pat);
//return;

// Source file
var fName = path.resolve(__dirname + "/raml_samples/database.raml");
// RAML JS API
const api:raml.Api = raml.loadApi(fName).getOrThrow();

const generator = new JavaClassesGenerator(api, "com.example.dbotest.db");

const baseGaeFolder = "/raml_samples/gae/src/main/";
const javaFilesFolder = path.join(__dirname, baseGaeFolder + "java/");
console.log("Saving .java files to ", javaFilesFolder);

generator.mapTypes({
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
const resWebXmlFile = generator.processWebXml(fs.readFileSync(webXmlFileFolder).toString("utf8"));
fs.writeFileSync(webXmlFileFolder, new Buffer(resWebXmlFile, "utf8"));