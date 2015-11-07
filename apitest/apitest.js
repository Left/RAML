/// <reference path="./node.d.ts" />
/// <reference path="./raml003parser.d.ts" />
/// <reference path="./raml003factory.d.ts" />
/// <reference path="./highLevelImpl.d.ts" />
/// <reference path="./lowLevelAST.d.ts" />
// This assigns global.RAML
require('e:/git/raml-js-parser-2/src/bundle.js');
var path = require("path");
var fName = path.resolve(__dirname + "/../raml_samples/database.raml");
var ramlInterface = global.RAML;
var api = ramlInterface.loadApi(fName).getOrElse(null);
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
console.log("=========== DOCUMENTATION ===========");
api.documentation().forEach(function (e, i) {
    console.log(i, e.title(), e.content().value());
});
var getTypeFromName = function (name) {
    return api.types().filter(function (t) { return t.name() === name; })[0];
};
var enumProps = function (el) {
    var ret = [];
    for (var s in el) {
        ret.push(s + (typeof (el[s]) === "function" ? "()" : ""));
    }
    return "{" + ret.join(', ') + "}";
};
console.log("============= RESOURCES =============");
api.resources().forEach(function (e, i) {
    console.log(i + "\n" +
        "\t" + e.relativeUri().value() + "\n" +
        // URL params
        "\t" + "[" + e.uriParameters().map(function (e) { return e.name() + ":" + e.type(); }).join(",") + "]" + "\n" +
        // Methods
        e.methods().map(function (e) { return "\t\t" + e.method() + "\n" +
            e.responses().map(function (k) { return "\t\t\t" + k.code().value() + "\n" +
                k.body().map(function (body) {
                    var t = body.type();
                    return t.map(function (type) {
                        var typp = getTypeFromName(type);
                        var props = typp.properties();
                        return "\t\t\t\t" + typp.name() + "\n" +
                            props.map(function (p) { return "\t\t\t\t\t" + p.name() + "\n" + p.annotations().map(function (aa) {
                                var s = (aa.value());
                                var iLowLevelASTNode = s.lowLevel();
                                return "\t\t\t\t\t\t" + aa.attr.value().valueName() + " " + s.valueName() + ":" + iLowLevelASTNode.value() + "\n";
                            }).join(""); }).join("") + "\n";
                    }).join("");
                }) + "\n"; }).join("") + "\n"; }).join(","));
});
//# sourceMappingURL=apitest.js.map