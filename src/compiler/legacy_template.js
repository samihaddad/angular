'use strict';"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var di_1 = require('angular2/src/core/di');
var lang_1 = require('angular2/src/facade/lang');
var html_ast_1 = require('./html_ast');
var html_parser_1 = require('./html_parser');
var util_1 = require('./util');
var LONG_SYNTAX_REGEXP = /^(?:on-(.*)|bindon-(.*)|bind-(.*)|var-(.*))$/ig;
var SHORT_SYNTAX_REGEXP = /^(?:\((.*)\)|\[\((.*)\)\]|\[(.*)\]|#(.*))$/ig;
var VARIABLE_TPL_BINDING_REGEXP = /(\bvar\s+|#)(\S+)/ig;
var TEMPLATE_SELECTOR_REGEXP = /^(\S+)/g;
var SPECIAL_PREFIXES_REGEXP = /^(class|style|attr)\./ig;
var INTERPOLATION_REGEXP = /\{\{.*?\}\}/g;
var SPECIAL_CASES = lang_1.CONST_EXPR([
    'ng-non-bindable',
    'ng-default-control',
    'ng-no-form',
]);
/**
 * Convert templates to the case sensitive syntax
 *
 * @internal
 */
var LegacyHtmlAstTransformer = (function () {
    function LegacyHtmlAstTransformer(dashCaseSelectors) {
        this.dashCaseSelectors = dashCaseSelectors;
        this.rewrittenAst = [];
        this.visitingTemplateEl = false;
    }
    LegacyHtmlAstTransformer.prototype.visitComment = function (ast, context) { return ast; };
    LegacyHtmlAstTransformer.prototype.visitElement = function (ast, context) {
        var _this = this;
        this.visitingTemplateEl = ast.name.toLowerCase() == 'template';
        var attrs = ast.attrs.map(function (attr) { return attr.visit(_this, null); });
        var children = ast.children.map(function (child) { return child.visit(_this, null); });
        return new html_ast_1.HtmlElementAst(ast.name, attrs, children, ast.sourceSpan, ast.startSourceSpan, ast.endSourceSpan);
    };
    LegacyHtmlAstTransformer.prototype.visitAttr = function (originalAst, context) {
        var ast = originalAst;
        if (this.visitingTemplateEl) {
            if (lang_1.isPresent(lang_1.RegExpWrapper.firstMatch(LONG_SYNTAX_REGEXP, ast.name))) {
                // preserve the "-" in the prefix for the long syntax
                ast = this._rewriteLongSyntax(ast);
            }
            else {
                // rewrite any other attribute
                var name_1 = util_1.dashCaseToCamelCase(ast.name);
                ast = name_1 == ast.name ? ast : new html_ast_1.HtmlAttrAst(name_1, ast.value, ast.sourceSpan);
            }
        }
        else {
            ast = this._rewriteTemplateAttribute(ast);
            ast = this._rewriteLongSyntax(ast);
            ast = this._rewriteShortSyntax(ast);
            ast = this._rewriteStar(ast);
            ast = this._rewriteInterpolation(ast);
            ast = this._rewriteSpecialCases(ast);
        }
        if (ast !== originalAst) {
            this.rewrittenAst.push(ast);
        }
        return ast;
    };
    LegacyHtmlAstTransformer.prototype.visitText = function (ast, context) { return ast; };
    LegacyHtmlAstTransformer.prototype._rewriteLongSyntax = function (ast) {
        var m = lang_1.RegExpWrapper.firstMatch(LONG_SYNTAX_REGEXP, ast.name);
        var attrName = ast.name;
        var attrValue = ast.value;
        if (lang_1.isPresent(m)) {
            if (lang_1.isPresent(m[1])) {
                attrName = "on-" + util_1.dashCaseToCamelCase(m[1]);
            }
            else if (lang_1.isPresent(m[2])) {
                attrName = "bindon-" + util_1.dashCaseToCamelCase(m[2]);
            }
            else if (lang_1.isPresent(m[3])) {
                attrName = "bind-" + util_1.dashCaseToCamelCase(m[3]);
            }
            else if (lang_1.isPresent(m[4])) {
                attrName = "var-" + util_1.dashCaseToCamelCase(m[4]);
                attrValue = util_1.dashCaseToCamelCase(attrValue);
            }
        }
        return attrName == ast.name && attrValue == ast.value ?
            ast :
            new html_ast_1.HtmlAttrAst(attrName, attrValue, ast.sourceSpan);
    };
    LegacyHtmlAstTransformer.prototype._rewriteTemplateAttribute = function (ast) {
        var name = ast.name;
        var value = ast.value;
        if (name.toLowerCase() == 'template') {
            name = 'template';
            // rewrite the directive selector
            value = lang_1.StringWrapper.replaceAllMapped(value, TEMPLATE_SELECTOR_REGEXP, function (m) { return util_1.dashCaseToCamelCase(m[1]); });
            // rewrite the var declarations
            value = lang_1.StringWrapper.replaceAllMapped(value, VARIABLE_TPL_BINDING_REGEXP, function (m) {
                return "" + m[1].toLowerCase() + util_1.dashCaseToCamelCase(m[2]);
            });
        }
        if (name == ast.name && value == ast.value) {
            return ast;
        }
        return new html_ast_1.HtmlAttrAst(name, value, ast.sourceSpan);
    };
    LegacyHtmlAstTransformer.prototype._rewriteShortSyntax = function (ast) {
        var m = lang_1.RegExpWrapper.firstMatch(SHORT_SYNTAX_REGEXP, ast.name);
        var attrName = ast.name;
        var attrValue = ast.value;
        if (lang_1.isPresent(m)) {
            if (lang_1.isPresent(m[1])) {
                attrName = "(" + util_1.dashCaseToCamelCase(m[1]) + ")";
            }
            else if (lang_1.isPresent(m[2])) {
                attrName = "[(" + util_1.dashCaseToCamelCase(m[2]) + ")]";
            }
            else if (lang_1.isPresent(m[3])) {
                var prop = lang_1.StringWrapper.replaceAllMapped(m[3], SPECIAL_PREFIXES_REGEXP, function (m) { return m[1].toLowerCase() + '.'; });
                if (prop.startsWith('class.') || prop.startsWith('attr.') || prop.startsWith('style.')) {
                    attrName = "[" + prop + "]";
                }
                else {
                    attrName = "[" + util_1.dashCaseToCamelCase(prop) + "]";
                }
            }
            else if (lang_1.isPresent(m[4])) {
                attrName = "#" + util_1.dashCaseToCamelCase(m[4]);
                attrValue = util_1.dashCaseToCamelCase(attrValue);
            }
        }
        return attrName == ast.name && attrValue == ast.value ?
            ast :
            new html_ast_1.HtmlAttrAst(attrName, attrValue, ast.sourceSpan);
    };
    LegacyHtmlAstTransformer.prototype._rewriteStar = function (ast) {
        var attrName = ast.name;
        var attrValue = ast.value;
        if (attrName[0] == '*') {
            attrName = util_1.dashCaseToCamelCase(attrName);
            // rewrite the var declarations
            attrValue = lang_1.StringWrapper.replaceAllMapped(attrValue, VARIABLE_TPL_BINDING_REGEXP, function (m) {
                return "" + m[1].toLowerCase() + util_1.dashCaseToCamelCase(m[2]);
            });
        }
        return attrName == ast.name && attrValue == ast.value ?
            ast :
            new html_ast_1.HtmlAttrAst(attrName, attrValue, ast.sourceSpan);
    };
    LegacyHtmlAstTransformer.prototype._rewriteInterpolation = function (ast) {
        var hasInterpolation = lang_1.RegExpWrapper.test(INTERPOLATION_REGEXP, ast.value);
        if (!hasInterpolation) {
            return ast;
        }
        var name = ast.name;
        if (!(name.startsWith('attr.') || name.startsWith('class.') || name.startsWith('style.'))) {
            name = util_1.dashCaseToCamelCase(ast.name);
        }
        return name == ast.name ? ast : new html_ast_1.HtmlAttrAst(name, ast.value, ast.sourceSpan);
    };
    LegacyHtmlAstTransformer.prototype._rewriteSpecialCases = function (ast) {
        var attrName = ast.name;
        if (SPECIAL_CASES.indexOf(attrName) > -1) {
            return new html_ast_1.HtmlAttrAst(util_1.dashCaseToCamelCase(attrName), ast.value, ast.sourceSpan);
        }
        if (lang_1.isPresent(this.dashCaseSelectors) && this.dashCaseSelectors.indexOf(attrName) > -1) {
            return new html_ast_1.HtmlAttrAst(util_1.dashCaseToCamelCase(attrName), ast.value, ast.sourceSpan);
        }
        return ast;
    };
    return LegacyHtmlAstTransformer;
}());
exports.LegacyHtmlAstTransformer = LegacyHtmlAstTransformer;
var LegacyHtmlParser = (function (_super) {
    __extends(LegacyHtmlParser, _super);
    function LegacyHtmlParser() {
        _super.apply(this, arguments);
    }
    LegacyHtmlParser.prototype.parse = function (sourceContent, sourceUrl) {
        var transformer = new LegacyHtmlAstTransformer();
        var htmlParseTreeResult = _super.prototype.parse.call(this, sourceContent, sourceUrl);
        var rootNodes = htmlParseTreeResult.rootNodes.map(function (node) { return node.visit(transformer, null); });
        return transformer.rewrittenAst.length > 0 ?
            new html_parser_1.HtmlParseTreeResult(rootNodes, htmlParseTreeResult.errors) :
            htmlParseTreeResult;
    };
    LegacyHtmlParser = __decorate([
        di_1.Injectable(), 
        __metadata('design:paramtypes', [])
    ], LegacyHtmlParser);
    return LegacyHtmlParser;
}(html_parser_1.HtmlParser));
exports.LegacyHtmlParser = LegacyHtmlParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVnYWN5X3RlbXBsYXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGlmZmluZ19wbHVnaW5fd3JhcHBlci1vdXRwdXRfcGF0aC1QZEpFQ0ZYVi50bXAvYW5ndWxhcjIvc3JjL2NvbXBpbGVyL2xlZ2FjeV90ZW1wbGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxtQkFBNEMsc0JBQXNCLENBQUMsQ0FBQTtBQUVuRSxxQkFNTywwQkFBMEIsQ0FBQyxDQUFBO0FBRWxDLHlCQU9PLFlBQVksQ0FBQyxDQUFBO0FBQ3BCLDRCQUE4QyxlQUFlLENBQUMsQ0FBQTtBQUU5RCxxQkFBdUQsUUFBUSxDQUFDLENBQUE7QUFFaEUsSUFBSSxrQkFBa0IsR0FBRyxnREFBZ0QsQ0FBQztBQUMxRSxJQUFJLG1CQUFtQixHQUFHLDhDQUE4QyxDQUFDO0FBQ3pFLElBQUksMkJBQTJCLEdBQUcscUJBQXFCLENBQUM7QUFDeEQsSUFBSSx3QkFBd0IsR0FBRyxTQUFTLENBQUM7QUFDekMsSUFBSSx1QkFBdUIsR0FBRyx5QkFBeUIsQ0FBQztBQUN4RCxJQUFJLG9CQUFvQixHQUFHLGNBQWMsQ0FBQztBQUUxQyxJQUFNLGFBQWEsR0FBRyxpQkFBVSxDQUFDO0lBQy9CLGlCQUFpQjtJQUNqQixvQkFBb0I7SUFDcEIsWUFBWTtDQUNiLENBQUMsQ0FBQztBQUVIOzs7O0dBSUc7QUFDSDtJQUlFLGtDQUFvQixpQkFBNEI7UUFBNUIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFXO1FBSGhELGlCQUFZLEdBQWMsRUFBRSxDQUFDO1FBQzdCLHVCQUFrQixHQUFZLEtBQUssQ0FBQztJQUVlLENBQUM7SUFFcEQsK0NBQVksR0FBWixVQUFhLEdBQW1CLEVBQUUsT0FBWSxJQUFTLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBRXBFLCtDQUFZLEdBQVosVUFBYSxHQUFtQixFQUFFLE9BQVk7UUFBOUMsaUJBTUM7UUFMQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxVQUFVLENBQUM7UUFDL0QsSUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUksRUFBRSxJQUFJLENBQUMsRUFBdEIsQ0FBc0IsQ0FBQyxDQUFDO1FBQzFELElBQUksUUFBUSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQUEsS0FBSyxJQUFJLE9BQUEsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFJLEVBQUUsSUFBSSxDQUFDLEVBQXZCLENBQXVCLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsSUFBSSx5QkFBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxlQUFlLEVBQzlELEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsNENBQVMsR0FBVCxVQUFVLFdBQXdCLEVBQUUsT0FBWTtRQUM5QyxJQUFJLEdBQUcsR0FBRyxXQUFXLENBQUM7UUFFdEIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztZQUM1QixFQUFFLENBQUMsQ0FBQyxnQkFBUyxDQUFDLG9CQUFhLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEUscURBQXFEO2dCQUNyRCxHQUFHLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JDLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTiw4QkFBOEI7Z0JBQzlCLElBQUksTUFBSSxHQUFHLDBCQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDekMsR0FBRyxHQUFHLE1BQUksSUFBSSxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLHNCQUFXLENBQUMsTUFBSSxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2xGLENBQUM7UUFDSCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixHQUFHLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzFDLEdBQUcsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkMsR0FBRyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM3QixHQUFHLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3RDLEdBQUcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLEdBQUcsS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELDRDQUFTLEdBQVQsVUFBVSxHQUFnQixFQUFFLE9BQVksSUFBaUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFFOUQscURBQWtCLEdBQTFCLFVBQTJCLEdBQWdCO1FBQ3pDLElBQUksQ0FBQyxHQUFHLG9CQUFhLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvRCxJQUFJLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ3hCLElBQUksU0FBUyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFMUIsRUFBRSxDQUFDLENBQUMsZ0JBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakIsRUFBRSxDQUFDLENBQUMsZ0JBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BCLFFBQVEsR0FBRyxRQUFNLDBCQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRyxDQUFDO1lBQy9DLENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsZ0JBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNCLFFBQVEsR0FBRyxZQUFVLDBCQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRyxDQUFDO1lBQ25ELENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsZ0JBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNCLFFBQVEsR0FBRyxVQUFRLDBCQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRyxDQUFDO1lBQ2pELENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsZ0JBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNCLFFBQVEsR0FBRyxTQUFPLDBCQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRyxDQUFDO2dCQUM5QyxTQUFTLEdBQUcsMEJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0MsQ0FBQztRQUNILENBQUM7UUFFRCxNQUFNLENBQUMsUUFBUSxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksU0FBUyxJQUFJLEdBQUcsQ0FBQyxLQUFLO1lBQzFDLEdBQUc7WUFDSCxJQUFJLHNCQUFXLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVPLDREQUF5QixHQUFqQyxVQUFrQyxHQUFnQjtRQUNoRCxJQUFJLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ3BCLElBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFdEIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLFVBQVUsQ0FBQztZQUVsQixpQ0FBaUM7WUFDakMsS0FBSyxHQUFHLG9CQUFhLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLHdCQUF3QixFQUMvQixVQUFDLENBQUMsSUFBTyxNQUFNLENBQUMsMEJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVyRiwrQkFBK0I7WUFDL0IsS0FBSyxHQUFHLG9CQUFhLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLDJCQUEyQixFQUFFLFVBQUEsQ0FBQztnQkFDMUUsTUFBTSxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLDBCQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRyxDQUFDO1lBQzdELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxJQUFJLEtBQUssSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUMzQyxNQUFNLENBQUMsR0FBRyxDQUFDO1FBQ2IsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLHNCQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVPLHNEQUFtQixHQUEzQixVQUE0QixHQUFnQjtRQUMxQyxJQUFJLENBQUMsR0FBRyxvQkFBYSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEUsSUFBSSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztRQUN4QixJQUFJLFNBQVMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRTFCLEVBQUUsQ0FBQyxDQUFDLGdCQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLEVBQUUsQ0FBQyxDQUFDLGdCQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNwQixRQUFRLEdBQUcsTUFBSSwwQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBRyxDQUFDO1lBQzlDLENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsZ0JBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNCLFFBQVEsR0FBRyxPQUFLLDBCQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFJLENBQUM7WUFDaEQsQ0FBQztZQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxnQkFBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0IsSUFBSSxJQUFJLEdBQUcsb0JBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsdUJBQXVCLEVBQzdCLFVBQUMsQ0FBQyxJQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRXZGLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdkYsUUFBUSxHQUFHLE1BQUksSUFBSSxNQUFHLENBQUM7Z0JBQ3pCLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04sUUFBUSxHQUFHLE1BQUksMEJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQUcsQ0FBQztnQkFDOUMsQ0FBQztZQUNILENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsZ0JBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNCLFFBQVEsR0FBRyxNQUFJLDBCQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRyxDQUFDO2dCQUMzQyxTQUFTLEdBQUcsMEJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0MsQ0FBQztRQUNILENBQUM7UUFFRCxNQUFNLENBQUMsUUFBUSxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksU0FBUyxJQUFJLEdBQUcsQ0FBQyxLQUFLO1lBQzFDLEdBQUc7WUFDSCxJQUFJLHNCQUFXLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVPLCtDQUFZLEdBQXBCLFVBQXFCLEdBQWdCO1FBQ25DLElBQUksUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDeEIsSUFBSSxTQUFTLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUUxQixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN2QixRQUFRLEdBQUcsMEJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDekMsK0JBQStCO1lBQy9CLFNBQVMsR0FBRyxvQkFBYSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSwyQkFBMkIsRUFBRSxVQUFBLENBQUM7Z0JBQ2xGLE1BQU0sQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRywwQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUcsQ0FBQztZQUM3RCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxNQUFNLENBQUMsUUFBUSxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksU0FBUyxJQUFJLEdBQUcsQ0FBQyxLQUFLO1lBQzFDLEdBQUc7WUFDSCxJQUFJLHNCQUFXLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVPLHdEQUFxQixHQUE3QixVQUE4QixHQUFnQjtRQUM1QyxJQUFJLGdCQUFnQixHQUFHLG9CQUFhLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUUzRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztZQUN0QixNQUFNLENBQUMsR0FBRyxDQUFDO1FBQ2IsQ0FBQztRQUVELElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFFcEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFGLElBQUksR0FBRywwQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxzQkFBVyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNuRixDQUFDO0lBRU8sdURBQW9CLEdBQTVCLFVBQTZCLEdBQWdCO1FBQzNDLElBQUksUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFFeEIsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekMsTUFBTSxDQUFDLElBQUksc0JBQVcsQ0FBQywwQkFBbUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNuRixDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsZ0JBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2RixNQUFNLENBQUMsSUFBSSxzQkFBVyxDQUFDLDBCQUFtQixDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25GLENBQUM7UUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUNILCtCQUFDO0FBQUQsQ0FBQyxBQXpLRCxJQXlLQztBQXpLWSxnQ0FBd0IsMkJBeUtwQyxDQUFBO0FBR0Q7SUFBc0Msb0NBQVU7SUFBaEQ7UUFBc0MsOEJBQVU7SUFXaEQsQ0FBQztJQVZDLGdDQUFLLEdBQUwsVUFBTSxhQUFxQixFQUFFLFNBQWlCO1FBQzVDLElBQUksV0FBVyxHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQztRQUNqRCxJQUFJLG1CQUFtQixHQUFHLGdCQUFLLENBQUMsS0FBSyxZQUFDLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUVoRSxJQUFJLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQTdCLENBQTZCLENBQUMsQ0FBQztRQUV6RixNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUMvQixJQUFJLGlDQUFtQixDQUFDLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQyxNQUFNLENBQUM7WUFDOUQsbUJBQW1CLENBQUM7SUFDakMsQ0FBQztJQVhIO1FBQUMsZUFBVSxFQUFFOzt3QkFBQTtJQVliLHVCQUFDO0FBQUQsQ0FBQyxBQVhELENBQXNDLHdCQUFVLEdBVy9DO0FBWFksd0JBQWdCLG1CQVc1QixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtJbmplY3RhYmxlLCBQcm92aWRlciwgcHJvdmlkZX0gZnJvbSAnYW5ndWxhcjIvc3JjL2NvcmUvZGknO1xuXG5pbXBvcnQge1xuICBTdHJpbmdXcmFwcGVyLFxuICBSZWdFeHBXcmFwcGVyLFxuICBDT05TVF9FWFBSLFxuICBpc0JsYW5rLFxuICBpc1ByZXNlbnRcbn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9sYW5nJztcblxuaW1wb3J0IHtcbiAgSHRtbEFzdFZpc2l0b3IsXG4gIEh0bWxBdHRyQXN0LFxuICBIdG1sRWxlbWVudEFzdCxcbiAgSHRtbFRleHRBc3QsXG4gIEh0bWxDb21tZW50QXN0LFxuICBIdG1sQXN0XG59IGZyb20gJy4vaHRtbF9hc3QnO1xuaW1wb3J0IHtIdG1sUGFyc2VyLCBIdG1sUGFyc2VUcmVlUmVzdWx0fSBmcm9tICcuL2h0bWxfcGFyc2VyJztcblxuaW1wb3J0IHtkYXNoQ2FzZVRvQ2FtZWxDYXNlLCBjYW1lbENhc2VUb0Rhc2hDYXNlfSBmcm9tICcuL3V0aWwnO1xuXG52YXIgTE9OR19TWU5UQVhfUkVHRVhQID0gL14oPzpvbi0oLiopfGJpbmRvbi0oLiopfGJpbmQtKC4qKXx2YXItKC4qKSkkL2lnO1xudmFyIFNIT1JUX1NZTlRBWF9SRUdFWFAgPSAvXig/OlxcKCguKilcXCl8XFxbXFwoKC4qKVxcKVxcXXxcXFsoLiopXFxdfCMoLiopKSQvaWc7XG52YXIgVkFSSUFCTEVfVFBMX0JJTkRJTkdfUkVHRVhQID0gLyhcXGJ2YXJcXHMrfCMpKFxcUyspL2lnO1xudmFyIFRFTVBMQVRFX1NFTEVDVE9SX1JFR0VYUCA9IC9eKFxcUyspL2c7XG52YXIgU1BFQ0lBTF9QUkVGSVhFU19SRUdFWFAgPSAvXihjbGFzc3xzdHlsZXxhdHRyKVxcLi9pZztcbnZhciBJTlRFUlBPTEFUSU9OX1JFR0VYUCA9IC9cXHtcXHsuKj9cXH1cXH0vZztcblxuY29uc3QgU1BFQ0lBTF9DQVNFUyA9IENPTlNUX0VYUFIoW1xuICAnbmctbm9uLWJpbmRhYmxlJyxcbiAgJ25nLWRlZmF1bHQtY29udHJvbCcsXG4gICduZy1uby1mb3JtJyxcbl0pO1xuXG4vKipcbiAqIENvbnZlcnQgdGVtcGxhdGVzIHRvIHRoZSBjYXNlIHNlbnNpdGl2ZSBzeW50YXhcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGNsYXNzIExlZ2FjeUh0bWxBc3RUcmFuc2Zvcm1lciBpbXBsZW1lbnRzIEh0bWxBc3RWaXNpdG9yIHtcbiAgcmV3cml0dGVuQXN0OiBIdG1sQXN0W10gPSBbXTtcbiAgdmlzaXRpbmdUZW1wbGF0ZUVsOiBib29sZWFuID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBkYXNoQ2FzZVNlbGVjdG9ycz86IHN0cmluZ1tdKSB7fVxuXG4gIHZpc2l0Q29tbWVudChhc3Q6IEh0bWxDb21tZW50QXN0LCBjb250ZXh0OiBhbnkpOiBhbnkgeyByZXR1cm4gYXN0OyB9XG5cbiAgdmlzaXRFbGVtZW50KGFzdDogSHRtbEVsZW1lbnRBc3QsIGNvbnRleHQ6IGFueSk6IEh0bWxFbGVtZW50QXN0IHtcbiAgICB0aGlzLnZpc2l0aW5nVGVtcGxhdGVFbCA9IGFzdC5uYW1lLnRvTG93ZXJDYXNlKCkgPT0gJ3RlbXBsYXRlJztcbiAgICBsZXQgYXR0cnMgPSBhc3QuYXR0cnMubWFwKGF0dHIgPT4gYXR0ci52aXNpdCh0aGlzLCBudWxsKSk7XG4gICAgbGV0IGNoaWxkcmVuID0gYXN0LmNoaWxkcmVuLm1hcChjaGlsZCA9PiBjaGlsZC52aXNpdCh0aGlzLCBudWxsKSk7XG4gICAgcmV0dXJuIG5ldyBIdG1sRWxlbWVudEFzdChhc3QubmFtZSwgYXR0cnMsIGNoaWxkcmVuLCBhc3Quc291cmNlU3BhbiwgYXN0LnN0YXJ0U291cmNlU3BhbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzdC5lbmRTb3VyY2VTcGFuKTtcbiAgfVxuXG4gIHZpc2l0QXR0cihvcmlnaW5hbEFzdDogSHRtbEF0dHJBc3QsIGNvbnRleHQ6IGFueSk6IEh0bWxBdHRyQXN0IHtcbiAgICBsZXQgYXN0ID0gb3JpZ2luYWxBc3Q7XG5cbiAgICBpZiAodGhpcy52aXNpdGluZ1RlbXBsYXRlRWwpIHtcbiAgICAgIGlmIChpc1ByZXNlbnQoUmVnRXhwV3JhcHBlci5maXJzdE1hdGNoKExPTkdfU1lOVEFYX1JFR0VYUCwgYXN0Lm5hbWUpKSkge1xuICAgICAgICAvLyBwcmVzZXJ2ZSB0aGUgXCItXCIgaW4gdGhlIHByZWZpeCBmb3IgdGhlIGxvbmcgc3ludGF4XG4gICAgICAgIGFzdCA9IHRoaXMuX3Jld3JpdGVMb25nU3ludGF4KGFzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyByZXdyaXRlIGFueSBvdGhlciBhdHRyaWJ1dGVcbiAgICAgICAgbGV0IG5hbWUgPSBkYXNoQ2FzZVRvQ2FtZWxDYXNlKGFzdC5uYW1lKTtcbiAgICAgICAgYXN0ID0gbmFtZSA9PSBhc3QubmFtZSA/IGFzdCA6IG5ldyBIdG1sQXR0ckFzdChuYW1lLCBhc3QudmFsdWUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYXN0ID0gdGhpcy5fcmV3cml0ZVRlbXBsYXRlQXR0cmlidXRlKGFzdCk7XG4gICAgICBhc3QgPSB0aGlzLl9yZXdyaXRlTG9uZ1N5bnRheChhc3QpO1xuICAgICAgYXN0ID0gdGhpcy5fcmV3cml0ZVNob3J0U3ludGF4KGFzdCk7XG4gICAgICBhc3QgPSB0aGlzLl9yZXdyaXRlU3Rhcihhc3QpO1xuICAgICAgYXN0ID0gdGhpcy5fcmV3cml0ZUludGVycG9sYXRpb24oYXN0KTtcbiAgICAgIGFzdCA9IHRoaXMuX3Jld3JpdGVTcGVjaWFsQ2FzZXMoYXN0KTtcbiAgICB9XG5cbiAgICBpZiAoYXN0ICE9PSBvcmlnaW5hbEFzdCkge1xuICAgICAgdGhpcy5yZXdyaXR0ZW5Bc3QucHVzaChhc3QpO1xuICAgIH1cblxuICAgIHJldHVybiBhc3Q7XG4gIH1cblxuICB2aXNpdFRleHQoYXN0OiBIdG1sVGV4dEFzdCwgY29udGV4dDogYW55KTogSHRtbFRleHRBc3QgeyByZXR1cm4gYXN0OyB9XG5cbiAgcHJpdmF0ZSBfcmV3cml0ZUxvbmdTeW50YXgoYXN0OiBIdG1sQXR0ckFzdCk6IEh0bWxBdHRyQXN0IHtcbiAgICBsZXQgbSA9IFJlZ0V4cFdyYXBwZXIuZmlyc3RNYXRjaChMT05HX1NZTlRBWF9SRUdFWFAsIGFzdC5uYW1lKTtcbiAgICBsZXQgYXR0ck5hbWUgPSBhc3QubmFtZTtcbiAgICBsZXQgYXR0clZhbHVlID0gYXN0LnZhbHVlO1xuXG4gICAgaWYgKGlzUHJlc2VudChtKSkge1xuICAgICAgaWYgKGlzUHJlc2VudChtWzFdKSkge1xuICAgICAgICBhdHRyTmFtZSA9IGBvbi0ke2Rhc2hDYXNlVG9DYW1lbENhc2UobVsxXSl9YDtcbiAgICAgIH0gZWxzZSBpZiAoaXNQcmVzZW50KG1bMl0pKSB7XG4gICAgICAgIGF0dHJOYW1lID0gYGJpbmRvbi0ke2Rhc2hDYXNlVG9DYW1lbENhc2UobVsyXSl9YDtcbiAgICAgIH0gZWxzZSBpZiAoaXNQcmVzZW50KG1bM10pKSB7XG4gICAgICAgIGF0dHJOYW1lID0gYGJpbmQtJHtkYXNoQ2FzZVRvQ2FtZWxDYXNlKG1bM10pfWA7XG4gICAgICB9IGVsc2UgaWYgKGlzUHJlc2VudChtWzRdKSkge1xuICAgICAgICBhdHRyTmFtZSA9IGB2YXItJHtkYXNoQ2FzZVRvQ2FtZWxDYXNlKG1bNF0pfWA7XG4gICAgICAgIGF0dHJWYWx1ZSA9IGRhc2hDYXNlVG9DYW1lbENhc2UoYXR0clZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYXR0ck5hbWUgPT0gYXN0Lm5hbWUgJiYgYXR0clZhbHVlID09IGFzdC52YWx1ZSA/XG4gICAgICAgICAgICAgICBhc3QgOlxuICAgICAgICAgICAgICAgbmV3IEh0bWxBdHRyQXN0KGF0dHJOYW1lLCBhdHRyVmFsdWUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgfVxuXG4gIHByaXZhdGUgX3Jld3JpdGVUZW1wbGF0ZUF0dHJpYnV0ZShhc3Q6IEh0bWxBdHRyQXN0KTogSHRtbEF0dHJBc3Qge1xuICAgIGxldCBuYW1lID0gYXN0Lm5hbWU7XG4gICAgbGV0IHZhbHVlID0gYXN0LnZhbHVlO1xuXG4gICAgaWYgKG5hbWUudG9Mb3dlckNhc2UoKSA9PSAndGVtcGxhdGUnKSB7XG4gICAgICBuYW1lID0gJ3RlbXBsYXRlJztcblxuICAgICAgLy8gcmV3cml0ZSB0aGUgZGlyZWN0aXZlIHNlbGVjdG9yXG4gICAgICB2YWx1ZSA9IFN0cmluZ1dyYXBwZXIucmVwbGFjZUFsbE1hcHBlZCh2YWx1ZSwgVEVNUExBVEVfU0VMRUNUT1JfUkVHRVhQLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKG0pID0+IHsgcmV0dXJuIGRhc2hDYXNlVG9DYW1lbENhc2UobVsxXSk7IH0pO1xuXG4gICAgICAvLyByZXdyaXRlIHRoZSB2YXIgZGVjbGFyYXRpb25zXG4gICAgICB2YWx1ZSA9IFN0cmluZ1dyYXBwZXIucmVwbGFjZUFsbE1hcHBlZCh2YWx1ZSwgVkFSSUFCTEVfVFBMX0JJTkRJTkdfUkVHRVhQLCBtID0+IHtcbiAgICAgICAgcmV0dXJuIGAke21bMV0udG9Mb3dlckNhc2UoKX0ke2Rhc2hDYXNlVG9DYW1lbENhc2UobVsyXSl9YDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChuYW1lID09IGFzdC5uYW1lICYmIHZhbHVlID09IGFzdC52YWx1ZSkge1xuICAgICAgcmV0dXJuIGFzdDtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IEh0bWxBdHRyQXN0KG5hbWUsIHZhbHVlLCBhc3Quc291cmNlU3Bhbik7XG4gIH1cblxuICBwcml2YXRlIF9yZXdyaXRlU2hvcnRTeW50YXgoYXN0OiBIdG1sQXR0ckFzdCk6IEh0bWxBdHRyQXN0IHtcbiAgICBsZXQgbSA9IFJlZ0V4cFdyYXBwZXIuZmlyc3RNYXRjaChTSE9SVF9TWU5UQVhfUkVHRVhQLCBhc3QubmFtZSk7XG4gICAgbGV0IGF0dHJOYW1lID0gYXN0Lm5hbWU7XG4gICAgbGV0IGF0dHJWYWx1ZSA9IGFzdC52YWx1ZTtcblxuICAgIGlmIChpc1ByZXNlbnQobSkpIHtcbiAgICAgIGlmIChpc1ByZXNlbnQobVsxXSkpIHtcbiAgICAgICAgYXR0ck5hbWUgPSBgKCR7ZGFzaENhc2VUb0NhbWVsQ2FzZShtWzFdKX0pYDtcbiAgICAgIH0gZWxzZSBpZiAoaXNQcmVzZW50KG1bMl0pKSB7XG4gICAgICAgIGF0dHJOYW1lID0gYFsoJHtkYXNoQ2FzZVRvQ2FtZWxDYXNlKG1bMl0pfSldYDtcbiAgICAgIH0gZWxzZSBpZiAoaXNQcmVzZW50KG1bM10pKSB7XG4gICAgICAgIGxldCBwcm9wID0gU3RyaW5nV3JhcHBlci5yZXBsYWNlQWxsTWFwcGVkKG1bM10sIFNQRUNJQUxfUFJFRklYRVNfUkVHRVhQLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAobSkgPT4geyByZXR1cm4gbVsxXS50b0xvd2VyQ2FzZSgpICsgJy4nOyB9KTtcblxuICAgICAgICBpZiAocHJvcC5zdGFydHNXaXRoKCdjbGFzcy4nKSB8fCBwcm9wLnN0YXJ0c1dpdGgoJ2F0dHIuJykgfHwgcHJvcC5zdGFydHNXaXRoKCdzdHlsZS4nKSkge1xuICAgICAgICAgIGF0dHJOYW1lID0gYFske3Byb3B9XWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXR0ck5hbWUgPSBgWyR7ZGFzaENhc2VUb0NhbWVsQ2FzZShwcm9wKX1dYDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpc1ByZXNlbnQobVs0XSkpIHtcbiAgICAgICAgYXR0ck5hbWUgPSBgIyR7ZGFzaENhc2VUb0NhbWVsQ2FzZShtWzRdKX1gO1xuICAgICAgICBhdHRyVmFsdWUgPSBkYXNoQ2FzZVRvQ2FtZWxDYXNlKGF0dHJWYWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGF0dHJOYW1lID09IGFzdC5uYW1lICYmIGF0dHJWYWx1ZSA9PSBhc3QudmFsdWUgP1xuICAgICAgICAgICAgICAgYXN0IDpcbiAgICAgICAgICAgICAgIG5ldyBIdG1sQXR0ckFzdChhdHRyTmFtZSwgYXR0clZhbHVlLCBhc3Quc291cmNlU3Bhbik7XG4gIH1cblxuICBwcml2YXRlIF9yZXdyaXRlU3Rhcihhc3Q6IEh0bWxBdHRyQXN0KTogSHRtbEF0dHJBc3Qge1xuICAgIGxldCBhdHRyTmFtZSA9IGFzdC5uYW1lO1xuICAgIGxldCBhdHRyVmFsdWUgPSBhc3QudmFsdWU7XG5cbiAgICBpZiAoYXR0ck5hbWVbMF0gPT0gJyonKSB7XG4gICAgICBhdHRyTmFtZSA9IGRhc2hDYXNlVG9DYW1lbENhc2UoYXR0ck5hbWUpO1xuICAgICAgLy8gcmV3cml0ZSB0aGUgdmFyIGRlY2xhcmF0aW9uc1xuICAgICAgYXR0clZhbHVlID0gU3RyaW5nV3JhcHBlci5yZXBsYWNlQWxsTWFwcGVkKGF0dHJWYWx1ZSwgVkFSSUFCTEVfVFBMX0JJTkRJTkdfUkVHRVhQLCBtID0+IHtcbiAgICAgICAgcmV0dXJuIGAke21bMV0udG9Mb3dlckNhc2UoKX0ke2Rhc2hDYXNlVG9DYW1lbENhc2UobVsyXSl9YDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBhdHRyTmFtZSA9PSBhc3QubmFtZSAmJiBhdHRyVmFsdWUgPT0gYXN0LnZhbHVlID9cbiAgICAgICAgICAgICAgIGFzdCA6XG4gICAgICAgICAgICAgICBuZXcgSHRtbEF0dHJBc3QoYXR0ck5hbWUsIGF0dHJWYWx1ZSwgYXN0LnNvdXJjZVNwYW4pO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmV3cml0ZUludGVycG9sYXRpb24oYXN0OiBIdG1sQXR0ckFzdCk6IEh0bWxBdHRyQXN0IHtcbiAgICBsZXQgaGFzSW50ZXJwb2xhdGlvbiA9IFJlZ0V4cFdyYXBwZXIudGVzdChJTlRFUlBPTEFUSU9OX1JFR0VYUCwgYXN0LnZhbHVlKTtcblxuICAgIGlmICghaGFzSW50ZXJwb2xhdGlvbikge1xuICAgICAgcmV0dXJuIGFzdDtcbiAgICB9XG5cbiAgICBsZXQgbmFtZSA9IGFzdC5uYW1lO1xuXG4gICAgaWYgKCEobmFtZS5zdGFydHNXaXRoKCdhdHRyLicpIHx8IG5hbWUuc3RhcnRzV2l0aCgnY2xhc3MuJykgfHwgbmFtZS5zdGFydHNXaXRoKCdzdHlsZS4nKSkpIHtcbiAgICAgIG5hbWUgPSBkYXNoQ2FzZVRvQ2FtZWxDYXNlKGFzdC5uYW1lKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmFtZSA9PSBhc3QubmFtZSA/IGFzdCA6IG5ldyBIdG1sQXR0ckFzdChuYW1lLCBhc3QudmFsdWUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgfVxuXG4gIHByaXZhdGUgX3Jld3JpdGVTcGVjaWFsQ2FzZXMoYXN0OiBIdG1sQXR0ckFzdCk6IEh0bWxBdHRyQXN0IHtcbiAgICBsZXQgYXR0ck5hbWUgPSBhc3QubmFtZTtcblxuICAgIGlmIChTUEVDSUFMX0NBU0VTLmluZGV4T2YoYXR0ck5hbWUpID4gLTEpIHtcbiAgICAgIHJldHVybiBuZXcgSHRtbEF0dHJBc3QoZGFzaENhc2VUb0NhbWVsQ2FzZShhdHRyTmFtZSksIGFzdC52YWx1ZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIH1cblxuICAgIGlmIChpc1ByZXNlbnQodGhpcy5kYXNoQ2FzZVNlbGVjdG9ycykgJiYgdGhpcy5kYXNoQ2FzZVNlbGVjdG9ycy5pbmRleE9mKGF0dHJOYW1lKSA+IC0xKSB7XG4gICAgICByZXR1cm4gbmV3IEh0bWxBdHRyQXN0KGRhc2hDYXNlVG9DYW1lbENhc2UoYXR0ck5hbWUpLCBhc3QudmFsdWUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXN0O1xuICB9XG59XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBMZWdhY3lIdG1sUGFyc2VyIGV4dGVuZHMgSHRtbFBhcnNlciB7XG4gIHBhcnNlKHNvdXJjZUNvbnRlbnQ6IHN0cmluZywgc291cmNlVXJsOiBzdHJpbmcpOiBIdG1sUGFyc2VUcmVlUmVzdWx0IHtcbiAgICBsZXQgdHJhbnNmb3JtZXIgPSBuZXcgTGVnYWN5SHRtbEFzdFRyYW5zZm9ybWVyKCk7XG4gICAgbGV0IGh0bWxQYXJzZVRyZWVSZXN1bHQgPSBzdXBlci5wYXJzZShzb3VyY2VDb250ZW50LCBzb3VyY2VVcmwpO1xuXG4gICAgbGV0IHJvb3ROb2RlcyA9IGh0bWxQYXJzZVRyZWVSZXN1bHQucm9vdE5vZGVzLm1hcChub2RlID0+IG5vZGUudmlzaXQodHJhbnNmb3JtZXIsIG51bGwpKTtcblxuICAgIHJldHVybiB0cmFuc2Zvcm1lci5yZXdyaXR0ZW5Bc3QubGVuZ3RoID4gMCA/XG4gICAgICAgICAgICAgICBuZXcgSHRtbFBhcnNlVHJlZVJlc3VsdChyb290Tm9kZXMsIGh0bWxQYXJzZVRyZWVSZXN1bHQuZXJyb3JzKSA6XG4gICAgICAgICAgICAgICBodG1sUGFyc2VUcmVlUmVzdWx0O1xuICB9XG59XG4iXX0=