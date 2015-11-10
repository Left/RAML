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

type Block = ()=>(Block|string)[] ;

const printBlock = function(b: Block, lvl?: number): string[] {
    lvl = lvl || 0;
    var ret: string[] = [];
    b().forEach((l: Block|string) => {
       if (typeof l === "string") {
           ret.push(Array(lvl+1).join("\t") + <string>l);
       } else {
           ret = ret.concat(printBlock(<Block>l, lvl+1));
       }
    });

    return ret;
};

const uppercaseFirst = function(str: string) : string {
    return str.substr(0, 1).toUpperCase() + str.substr(1);
};

const mapTypes = function(api: Api, packageName: string, out: OutFolder) {
    const toJavaTypeImpl = function(type: string, onObject: (typeName: string) => void) {
        if (type === "string") {
            return "String";
        } else if (type === "number") {
            return "Integer"; // TODO: map other types here
        } else if (type === "boolean") {
            return "boolean";
        } else {
            onObject(type);
            return type;
        }
    }

    api.types().forEach((type) => {
        const packageAsArray = packageName.split(".");

        const block:Block = () => {
            var imports: { [typeName: string]:any } = {
                "javax.persistence.Entity" : "",
                "javax.persistence.Id" : "",
                "javax.persistence.Basic" : ""
            };

            const toJavaType = function(type: string) {
                return toJavaTypeImpl(type, (type) => {
                    imports[packageAsArray.concat([type]).join(".")] = "";
                });
            };

            const props = type.properties();

            var wholeClassContent = [];

            wholeClassContent.push("// Properties:");

            props.forEach((prop) => {
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
                "class " + type.name() + "{",
                () => wholeClassContent,
                "}"
            ];

            return [
                "// This file is generated.",
                "// please don't edit it manually.",
                "",
                "package " + packageAsArray.join(".") + ";",
                () => [""]
            ]
            .concat([
                ""
            ])
            .concat(Object.keys(imports).map((type) => "import " + type + ";"))
            .concat([""])
            .concat(classDeclaration);
        };

        const stream = out.createOutStream(packageAsArray.concat([type.name() + ".java"]));
        stream.write(printBlock(block).join("\n"));
        stream.close();
    });
};

// const tempFolder = path.join(os.tmpdir(), "jdo_output");

const javaFilesFolder = path.join(__dirname, "/../raml_samples/gae/src/main/java/");

console.log("Saving .java files to ", javaFilesFolder);

mapTypes(api, "com.example.dbotest.db", {
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