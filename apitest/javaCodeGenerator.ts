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
    createOutStream(name: string): TextStream;
}

type Block = ()=>(Block|string)[];

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

const mapTypes = function(api:Api, out: OutFolder) {
    const toJavaType = function(type: string) {
        if (type === "string") {
            return "String";
        } else if (type === "number") {
            return "Integer"; // TODO: map other types here
        } else if (type === "boolean") {
            return "boolean";
        } else {
            return type;
        }
    }

    api.types().forEach((type) => {
        const block:Block = () => {
            return [
                "// This file is generated.",
                "// please don't edit it manually.",
                "",
                "/**",
                " * " + type.displayName(),
                " */",
                "class " + type.name() + "{",

                () => {
                    const props = type.properties();

                    var properties = props.map((prop) =>
                        "private " + toJavaType(prop.type()[0]) + " " + prop.name() + ";");

                    var methods = [];

                    // Getters
                    methods.push("");
                    methods.push("// Getters:");

                    props.forEach((prop) => {
                        methods = methods.concat([
                            "public " + toJavaType(prop.type()[0]) + " get" + uppercaseFirst(prop.name()) + "() { ",
                            () => ["return " + prop.name() + ";"],
                            "};"]);
                    });

                    // Setters
                    methods.push("");
                    methods.push("// Setters:");

                    props.forEach((prop) => {
                        methods.push("public void set" + uppercaseFirst(prop.name()) + "(" + toJavaType(prop.type()[0]) + " " + prop.name() + ") { ");
                        methods.push(() => ["this." + prop.name() + "=" + prop.name() + ";"]);
                        methods.push("};");
                    });

                    return [ "// Properties:"].concat(
                            properties
                        ).concat(
                            methods
                        );
                },
                "}"
            ];
        };

        const stream = out.createOutStream(type.name() + ".java");
        stream.write(printBlock(block).join("\n"));
        stream.close();
    });
};

const tempFolder = path.join(os.tmpdir(), "jdo_output");
console.log("Saving files to ", tempFolder);

mapTypes(api, {
    createOutStream(name) {
        if (!fs.existsSync(tempFolder)) {
            fs.mkdirSync(tempFolder);
        }
        const strm = fs.createWriteStream(path.join(tempFolder, name), { encoding: "utf8" });
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