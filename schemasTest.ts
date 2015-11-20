/// <reference path="node_modules/raml-1-0-parser/parser-typings/raml1Parser.d.ts" />

import raml = require("raml-1-0-parser");
import fs = require("fs");
import path = require("path");

var fName = path.resolve(__dirname + "/node_modules/raml-1-0-parser/raml-specs/XKCD/api.raml");
var api = raml.loadApi(fName).getOrThrow();

api.schemas().forEach(s => {
    console.log(s.key(), s.value().value());
});

console.log([1, 2, 3, 4, 5, 6].reduce((a, b) => a * b, 1));

Promise;