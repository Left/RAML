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

const enumProps = function (el): string {
    const ret = [];
    for (const s in el) {
        ret.push(s + (typeof (el[s]) === "function" ? "()" : ""));
    }
    ret.sort();
    return "{\n\t" + ret.join(',\n\t') + "}\n";
};

var testType = function (){
    console.log(api.title());
    console.log(api.version());
    console.log(api.baseUri().value());
    console.log(api.displayName());
    console.log(api.name());
    /*
     api.baseUriParameters().forEach((e, i) => {
         console.log(i, e.name());
         });
     */
    console.log(api.protocols().join(","));

    console.log("============= LIBS =============");

    api.

        uses().forEach((us) => {
            console.log(us.name());
            us.
            annotationTypes().forEach((at) => {
                console.log("\t", at.name(), "[", at.parameters().map((par) => par.name() + ":" + par.type()).join(","), "]");
            })
            ;
        })

        ;

    console.log("============= TYPES =============");

    api.types().forEach((t) => {
            // console.log(enumProps(t));
            console.log(t.name() + " " + t.annotations()
            );
            t.properties().forEach((p) => {
                console.log("\t", p.name(), p.type(), p.
                annotations().

                    length);
            });
        });

    console.log("=========== DOCUMENTATION ===========");

    api.documentation().
        forEach((e, i) => {
            console.log(i, e.title(
            ), e

                .content().value());
        });

    console.log(
            "============= RESOURCES =============");
    api.
        resources().forEach((e, i) => {
            console.log(i + "\n" +
                "\t" + e.
                relativeUri().
                value() + "\n" +
                    // URL params
                "\t" + "[" + e.uriParameters().map((e) => e.name() + ":" + e.type()).
                join(",") + "]" + "\n" +
                    // Methods
                e.methods().map(
                    (e) => "\t\t" + e.method() + "\n" +
                    e.responses().map(
                        (k) =>
                        "\t\t\t" + k.code().value() + "\n" +
                        k.body().map((body) => {
                            const t = body.type();
                            return t.map((type) => {
                                const typp = getTypeFromName(type);
                                const props = typp.properties();
                                return "\t\t\t\t" + typp.name()  + "\n" +
                                    props.map((p) => "\t\t\t\t\t" + p.name() + "\n" + p.annotations().map(
                                        (aa) => {
                                            const s = <StructuredValue>(<any>((<AnnotationRef>aa).value()));
                                            var iLowLevelASTNode = s.lowLevel();
                                            return
                                                "\t\t\t\t\t\t" + aa.attr.value().valueName() + " " + s.valueName() + ":" + iLowLevelASTNode.value() + "\n";
                                            }
                                        ).join("")).join("") + "\n";
                                }).join("");
                            }) + "\n").join("") + "\n"
            ).join(",")
        );
    });
};

// testType();

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
}

/*
const b: Block = () => [
    "class A {",
    () => [
            "// A",
            "// B",
            () => [
                    "// Level 3",
                    "// Level 3!"
            ]
        ],
    "};"
];

console.log(printBlock(b).join("\n"));
*/

