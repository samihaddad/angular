'use strict';"use strict";
var o = require('../output/output_ast');
var identifiers_1 = require('../identifiers');
var constants_1 = require('./constants');
var template_ast_1 = require('../template_ast');
var lang_1 = require('angular2/src/facade/lang');
var lifecycle_hooks_1 = require('angular2/src/core/metadata/lifecycle_hooks');
var constants_2 = require('angular2/src/core/change_detection/constants');
var util_1 = require('../util');
var expression_converter_1 = require('./expression_converter');
var compile_binding_1 = require('./compile_binding');
function createBindFieldExpr(exprIndex) {
    return o.THIS_EXPR.prop("_expr_" + exprIndex);
}
function createCurrValueExpr(exprIndex) {
    return o.variable("currVal_" + exprIndex);
}
function bind(view, currValExpr, fieldExpr, parsedExpression, context, actions, method) {
    var checkExpression = expression_converter_1.convertCdExpressionToIr(view, context, parsedExpression, constants_1.DetectChangesVars.valUnwrapper);
    if (lang_1.isBlank(checkExpression.expression)) {
        // e.g. an empty expression was given
        return;
    }
    view.fields.push(new o.ClassField(fieldExpr.name, null, [o.StmtModifier.Private]));
    view.createMethod.addStmt(o.THIS_EXPR.prop(fieldExpr.name).set(o.importExpr(identifiers_1.Identifiers.uninitialized)).toStmt());
    if (checkExpression.needsValueUnwrapper) {
        var initValueUnwrapperStmt = constants_1.DetectChangesVars.valUnwrapper.callMethod('reset', []).toStmt();
        method.addStmt(initValueUnwrapperStmt);
    }
    method.addStmt(currValExpr.set(checkExpression.expression).toDeclStmt(null, [o.StmtModifier.Final]));
    var condition = o.importExpr(identifiers_1.Identifiers.checkBinding)
        .callFn([constants_1.DetectChangesVars.throwOnChange, fieldExpr, currValExpr]);
    if (checkExpression.needsValueUnwrapper) {
        condition = constants_1.DetectChangesVars.valUnwrapper.prop('hasWrappedValue').or(condition);
    }
    method.addStmt(new o.IfStmt(condition, actions.concat([o.THIS_EXPR.prop(fieldExpr.name).set(currValExpr).toStmt()])));
}
function bindRenderText(boundText, compileNode, view) {
    var bindingIndex = view.bindings.length;
    view.bindings.push(new compile_binding_1.CompileBinding(compileNode, boundText));
    var currValExpr = createCurrValueExpr(bindingIndex);
    var valueField = createBindFieldExpr(bindingIndex);
    view.detectChangesInInputsMethod.resetDebugInfo(compileNode.nodeIndex, boundText);
    bind(view, currValExpr, valueField, boundText.value, o.THIS_EXPR.prop('context'), [
        o.THIS_EXPR.prop('renderer')
            .callMethod('setText', [compileNode.renderNode, currValExpr])
            .toStmt()
    ], view.detectChangesInInputsMethod);
}
exports.bindRenderText = bindRenderText;
function bindAndWriteToRenderer(boundProps, context, compileElement) {
    var view = compileElement.view;
    var renderNode = compileElement.renderNode;
    boundProps.forEach(function (boundProp) {
        var bindingIndex = view.bindings.length;
        view.bindings.push(new compile_binding_1.CompileBinding(compileElement, boundProp));
        view.detectChangesHostPropertiesMethod.resetDebugInfo(compileElement.nodeIndex, boundProp);
        var fieldExpr = createBindFieldExpr(bindingIndex);
        var currValExpr = createCurrValueExpr(bindingIndex);
        var renderMethod;
        var renderValue = currValExpr;
        var updateStmts = [];
        switch (boundProp.type) {
            case template_ast_1.PropertyBindingType.Property:
                renderMethod = 'setElementProperty';
                if (view.genConfig.logBindingUpdate) {
                    updateStmts.push(logBindingUpdateStmt(renderNode, boundProp.name, currValExpr));
                }
                break;
            case template_ast_1.PropertyBindingType.Attribute:
                renderMethod = 'setElementAttribute';
                renderValue =
                    renderValue.isBlank().conditional(o.NULL_EXPR, renderValue.callMethod('toString', []));
                break;
            case template_ast_1.PropertyBindingType.Class:
                renderMethod = 'setElementClass';
                break;
            case template_ast_1.PropertyBindingType.Style:
                renderMethod = 'setElementStyle';
                var strValue = renderValue.callMethod('toString', []);
                if (lang_1.isPresent(boundProp.unit)) {
                    strValue = strValue.plus(o.literal(boundProp.unit));
                }
                renderValue = renderValue.isBlank().conditional(o.NULL_EXPR, strValue);
                break;
        }
        updateStmts.push(o.THIS_EXPR.prop('renderer')
            .callMethod(renderMethod, [renderNode, o.literal(boundProp.name), renderValue])
            .toStmt());
        bind(view, currValExpr, fieldExpr, boundProp.value, context, updateStmts, view.detectChangesHostPropertiesMethod);
    });
}
function bindRenderInputs(boundProps, compileElement) {
    bindAndWriteToRenderer(boundProps, o.THIS_EXPR.prop('context'), compileElement);
}
exports.bindRenderInputs = bindRenderInputs;
function bindDirectiveHostProps(directiveAst, directiveInstance, compileElement) {
    bindAndWriteToRenderer(directiveAst.hostProperties, directiveInstance, compileElement);
}
exports.bindDirectiveHostProps = bindDirectiveHostProps;
function bindDirectiveInputs(directiveAst, directiveInstance, compileElement) {
    if (directiveAst.inputs.length === 0) {
        return;
    }
    var view = compileElement.view;
    var detectChangesInInputsMethod = view.detectChangesInInputsMethod;
    detectChangesInInputsMethod.resetDebugInfo(compileElement.nodeIndex, compileElement.sourceAst);
    var lifecycleHooks = directiveAst.directive.lifecycleHooks;
    var calcChangesMap = lifecycleHooks.indexOf(lifecycle_hooks_1.LifecycleHooks.OnChanges) !== -1;
    var isOnPushComp = directiveAst.directive.isComponent &&
        !constants_2.isDefaultChangeDetectionStrategy(directiveAst.directive.changeDetection);
    if (calcChangesMap) {
        detectChangesInInputsMethod.addStmt(constants_1.DetectChangesVars.changes.set(o.NULL_EXPR).toStmt());
    }
    if (isOnPushComp) {
        detectChangesInInputsMethod.addStmt(constants_1.DetectChangesVars.changed.set(o.literal(false)).toStmt());
    }
    directiveAst.inputs.forEach(function (input) {
        var bindingIndex = view.bindings.length;
        view.bindings.push(new compile_binding_1.CompileBinding(compileElement, input));
        detectChangesInInputsMethod.resetDebugInfo(compileElement.nodeIndex, input);
        var fieldExpr = createBindFieldExpr(bindingIndex);
        var currValExpr = createCurrValueExpr(bindingIndex);
        var statements = [directiveInstance.prop(input.directiveName).set(currValExpr).toStmt()];
        if (calcChangesMap) {
            statements.push(new o.IfStmt(constants_1.DetectChangesVars.changes.identical(o.NULL_EXPR), [
                constants_1.DetectChangesVars.changes.set(o.literalMap([], new o.MapType(o.importType(identifiers_1.Identifiers.SimpleChange))))
                    .toStmt()
            ]));
            statements.push(constants_1.DetectChangesVars.changes.key(o.literal(input.directiveName))
                .set(o.importExpr(identifiers_1.Identifiers.SimpleChange).instantiate([fieldExpr, currValExpr]))
                .toStmt());
        }
        if (isOnPushComp) {
            statements.push(constants_1.DetectChangesVars.changed.set(o.literal(true)).toStmt());
        }
        if (view.genConfig.logBindingUpdate) {
            statements.push(logBindingUpdateStmt(compileElement.renderNode, input.directiveName, currValExpr));
        }
        bind(view, currValExpr, fieldExpr, input.value, o.THIS_EXPR.prop('context'), statements, detectChangesInInputsMethod);
    });
    if (isOnPushComp) {
        detectChangesInInputsMethod.addStmt(new o.IfStmt(constants_1.DetectChangesVars.changed, [
            compileElement.getOrCreateAppElement()
                .prop('componentView')
                .callMethod('markAsCheckOnce', [])
                .toStmt()
        ]));
    }
}
exports.bindDirectiveInputs = bindDirectiveInputs;
function logBindingUpdateStmt(renderNode, propName, value) {
    return o.THIS_EXPR.prop('renderer')
        .callMethod('setBindingDebugInfo', [
        renderNode,
        o.literal("ng-reflect-" + util_1.camelCaseToDashCase(propName)),
        value.isBlank().conditional(o.NULL_EXPR, value.callMethod('toString', []))
    ])
        .toStmt();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvcGVydHlfYmluZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGlmZmluZ19wbHVnaW5fd3JhcHBlci1vdXRwdXRfcGF0aC1QZEpFQ0ZYVi50bXAvYW5ndWxhcjIvc3JjL2NvbXBpbGVyL3ZpZXdfY29tcGlsZXIvcHJvcGVydHlfYmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxJQUFZLENBQUMsV0FBTSxzQkFBc0IsQ0FBQyxDQUFBO0FBQzFDLDRCQUEwQixnQkFBZ0IsQ0FBQyxDQUFBO0FBQzNDLDBCQUFnQyxhQUFhLENBQUMsQ0FBQTtBQUU5Qyw2QkFNTyxpQkFBaUIsQ0FBQyxDQUFBO0FBRXpCLHFCQUFzRCwwQkFBMEIsQ0FBQyxDQUFBO0FBTWpGLGdDQUE2Qiw0Q0FBNEMsQ0FBQyxDQUFBO0FBQzFFLDBCQUErQyw4Q0FBOEMsQ0FBQyxDQUFBO0FBQzlGLHFCQUFrQyxTQUFTLENBQUMsQ0FBQTtBQUU1QyxxQ0FBc0Msd0JBQXdCLENBQUMsQ0FBQTtBQUUvRCxnQ0FBNkIsbUJBQW1CLENBQUMsQ0FBQTtBQUVqRCw2QkFBNkIsU0FBaUI7SUFDNUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVMsU0FBVyxDQUFDLENBQUM7QUFDaEQsQ0FBQztBQUVELDZCQUE2QixTQUFpQjtJQUM1QyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFXLFNBQVcsQ0FBQyxDQUFDO0FBQzVDLENBQUM7QUFFRCxjQUFjLElBQWlCLEVBQUUsV0FBMEIsRUFBRSxTQUF5QixFQUN4RSxnQkFBMkIsRUFBRSxPQUFxQixFQUFFLE9BQXNCLEVBQzFFLE1BQXFCO0lBQ2pDLElBQUksZUFBZSxHQUNmLDhDQUF1QixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsNkJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDN0YsRUFBRSxDQUFDLENBQUMsY0FBTyxDQUFDLGVBQWUsQ0FBQyxV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QUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxFQUNsRiwyQkFBMkIsQ0FBQyxDQUFDO0lBQ3BDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNqQiwyQkFBMkIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLDZCQUFpQixDQUFDLE9BQU8sRUFBRTtZQUMxRSxjQUFjLENBQUMscUJBQXFCLEVBQUU7aUJBQ2pDLElBQUksQ0FBQyxlQUFlLENBQUM7aUJBQ3JCLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUM7aUJBQ2pDLE1BQU0sRUFBRTtTQUNkLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztBQUNILENBQUM7QUF4RGUsMkJBQW1CLHNCQXdEbEMsQ0FBQTtBQUVELDhCQUE4QixVQUF3QixFQUFFLFFBQWdCLEVBQzFDLEtBQW1CO0lBQy9DLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7U0FDOUIsVUFBVSxDQUFDLHFCQUFxQixFQUNyQjtRQUNFLFVBQVU7UUFDVixDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFjLDBCQUFtQixDQUFDLFFBQVEsQ0FBRyxDQUFDO1FBQ3hELEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUMzRSxDQUFDO1NBQ2IsTUFBTSxFQUFFLENBQUM7QUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkQXN0IGZyb20gJy4uL2V4cHJlc3Npb25fcGFyc2VyL2FzdCc7XG5pbXBvcnQgKiBhcyBvIGZyb20gJy4uL291dHB1dC9vdXRwdXRfYXN0JztcbmltcG9ydCB7SWRlbnRpZmllcnN9IGZyb20gJy4uL2lkZW50aWZpZXJzJztcbmltcG9ydCB7RGV0ZWN0Q2hhbmdlc1ZhcnN9IGZyb20gJy4vY29uc3RhbnRzJztcblxuaW1wb3J0IHtcbiAgQm91bmRUZXh0QXN0LFxuICBCb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdCxcbiAgRGlyZWN0aXZlQXN0LFxuICBQcm9wZXJ0eUJpbmRpbmdUeXBlLFxuICBUZW1wbGF0ZUFzdFxufSBmcm9tICcuLi90ZW1wbGF0ZV9hc3QnO1xuXG5pbXBvcnQge2lzQmxhbmssIGlzUHJlc2VudCwgaXNBcnJheSwgQ09OU1RfRVhQUn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9sYW5nJztcblxuaW1wb3J0IHtDb21waWxlVmlld30gZnJvbSAnLi9jb21waWxlX3ZpZXcnO1xuaW1wb3J0IHtDb21waWxlRWxlbWVudCwgQ29tcGlsZU5vZGV9IGZyb20gJy4vY29tcGlsZV9lbGVtZW50JztcbmltcG9ydCB7Q29tcGlsZU1ldGhvZH0gZnJvbSAnLi9jb21waWxlX21ldGhvZCc7XG5cbmltcG9ydCB7TGlmZWN5Y2xlSG9va3N9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL21ldGFkYXRhL2xpZmVjeWNsZV9ob29rcyc7XG5pbXBvcnQge2lzRGVmYXVsdENoYW5nZURldGVjdGlvblN0cmF0ZWd5fSBmcm9tICdhbmd1bGFyMi9zcmMvY29yZS9jaGFuZ2VfZGV0ZWN0aW9uL2NvbnN0YW50cyc7XG5pbXBvcnQge2NhbWVsQ2FzZVRvRGFzaENhc2V9IGZyb20gJy4uL3V0aWwnO1xuXG5pbXBvcnQge2NvbnZlcnRDZEV4cHJlc3Npb25Ub0lyfSBmcm9tICcuL2V4cHJlc3Npb25fY29udmVydGVyJztcblxuaW1wb3J0IHtDb21waWxlQmluZGluZ30gZnJvbSAnLi9jb21waWxlX2JpbmRpbmcnO1xuXG5mdW5jdGlvbiBjcmVhdGVCaW5kRmllbGRFeHByKGV4cHJJbmRleDogbnVtYmVyKTogby5SZWFkUHJvcEV4cHIge1xuICByZXR1cm4gby5USElTX0VYUFIucHJvcChgX2V4cHJfJHtleHBySW5kZXh9YCk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUN1cnJWYWx1ZUV4cHIoZXhwckluZGV4OiBudW1iZXIpOiBvLlJlYWRWYXJFeHByIHtcbiAgcmV0dXJuIG8udmFyaWFibGUoYGN1cnJWYWxfJHtleHBySW5kZXh9YCk7XG59XG5cbmZ1bmN0aW9uIGJpbmQodmlldzogQ29tcGlsZVZpZXcsIGN1cnJWYWxFeHByOiBvLlJlYWRWYXJFeHByLCBmaWVsZEV4cHI6IG8uUmVhZFByb3BFeHByLFxuICAgICAgICAgICAgICBwYXJzZWRFeHByZXNzaW9uOiBjZEFzdC5BU1QsIGNvbnRleHQ6IG8uRXhwcmVzc2lvbiwgYWN0aW9uczogby5TdGF0ZW1lbnRbXSxcbiAgICAgICAgICAgICAgbWV0aG9kOiBDb21waWxlTWV0aG9kKSB7XG4gIHZhciBjaGVja0V4cHJlc3Npb24gPVxuICAgICAgY29udmVydENkRXhwcmVzc2lvblRvSXIodmlldywgY29udGV4dCwgcGFyc2VkRXhwcmVzc2lvbiwgRGV0ZWN0Q2hhbmdlc1ZhcnMudmFsVW53cmFwcGVyKTtcbiAgaWYgKGlzQmxhbmsoY2hlY2tFeHByZXNzaW9uLmV4cHJlc3Npb24pKSB7XG4gICAgLy8gZS5nLiBhbiBlbXB0eSBleHByZXNzaW9uIHdhcyBnaXZlblxuICAgIHJldHVybjtcbiAgfVxuXG4gIHZpZXcuZmllbGRzLnB1c2gobmV3IG8uQ2xhc3NGaWVsZChmaWVsZEV4cHIubmFtZSwgbnVsbCwgW28uU3RtdE1vZGlmaWVyLlByaXZhdGVdKSk7XG4gIHZpZXcuY3JlYXRlTWV0aG9kLmFkZFN0bXQoXG4gICAgICBvLlRISVNfRVhQUi5wcm9wKGZpZWxkRXhwci5uYW1lKS5zZXQoby5pbXBvcnRFeHByKElkZW50aWZpZXJzLnVuaW5pdGlhbGl6ZWQpKS50b1N0bXQoKSk7XG5cbiAgaWYgKGNoZWNrRXhwcmVzc2lvbi5uZWVkc1ZhbHVlVW53cmFwcGVyKSB7XG4gICAgdmFyIGluaXRWYWx1ZVVud3JhcHBlclN0bXQgPSBEZXRlY3RDaGFuZ2VzVmFycy52YWxVbndyYXBwZXIuY2FsbE1ldGhvZCgncmVzZXQnLCBbXSkudG9TdG10KCk7XG4gICAgbWV0aG9kLmFkZFN0bXQoaW5pdFZhbHVlVW53cmFwcGVyU3RtdCk7XG4gIH1cbiAgbWV0aG9kLmFkZFN0bXQoXG4gICAgICBjdXJyVmFsRXhwci5zZXQoY2hlY2tFeHByZXNzaW9uLmV4cHJlc3Npb24pLnRvRGVjbFN0bXQobnVsbCwgW28uU3RtdE1vZGlmaWVyLkZpbmFsXSkpO1xuXG4gIHZhciBjb25kaXRpb246IG8uRXhwcmVzc2lvbiA9XG4gICAgICBvLmltcG9ydEV4cHIoSWRlbnRpZmllcnMuY2hlY2tCaW5kaW5nKVxuICAgICAgICAgIC5jYWxsRm4oW0RldGVjdENoYW5nZXNWYXJzLnRocm93T25DaGFuZ2UsIGZpZWxkRXhwciwgY3VyclZhbEV4cHJdKTtcbiAgaWYgKGNoZWNrRXhwcmVzc2lvbi5uZWVkc1ZhbHVlVW53cmFwcGVyKSB7XG4gICAgY29uZGl0aW9uID0gRGV0ZWN0Q2hhbmdlc1ZhcnMudmFsVW53cmFwcGVyLnByb3AoJ2hhc1dyYXBwZWRWYWx1ZScpLm9yKGNvbmRpdGlvbik7XG4gIH1cbiAgbWV0aG9kLmFkZFN0bXQobmV3IG8uSWZTdG10KFxuICAgICAgY29uZGl0aW9uLFxuICAgICAgYWN0aW9ucy5jb25jYXQoWzxvLlN0YXRlbWVudD5vLlRISVNfRVhQUi5wcm9wKGZpZWxkRXhwci5uYW1lKS5zZXQoY3VyclZhbEV4cHIpLnRvU3RtdCgpXSkpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJpbmRSZW5kZXJUZXh0KGJvdW5kVGV4dDogQm91bmRUZXh0QXN0LCBjb21waWxlTm9kZTogQ29tcGlsZU5vZGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldzogQ29tcGlsZVZpZXcpIHtcbiAgdmFyIGJpbmRpbmdJbmRleCA9IHZpZXcuYmluZGluZ3MubGVuZ3RoO1xuICB2aWV3LmJpbmRpbmdzLnB1c2gobmV3IENvbXBpbGVCaW5kaW5nKGNvbXBpbGVOb2RlLCBib3VuZFRleHQpKTtcbiAgdmFyIGN1cnJWYWxFeHByID0gY3JlYXRlQ3VyclZhbHVlRXhwcihiaW5kaW5nSW5kZXgpO1xuICB2YXIgdmFsdWVGaWVsZCA9IGNyZWF0ZUJpbmRGaWVsZEV4cHIoYmluZGluZ0luZGV4KTtcbiAgdmlldy5kZXRlY3RDaGFuZ2VzSW5JbnB1dHNNZXRob2QucmVzZXREZWJ1Z0luZm8oY29tcGlsZU5vZGUubm9kZUluZGV4LCBib3VuZFRleHQpO1xuXG4gIGJpbmQodmlldywgY3VyclZhbEV4cHIsIHZhbHVlRmllbGQsIGJvdW5kVGV4dC52YWx1ZSwgby5USElTX0VYUFIucHJvcCgnY29udGV4dCcpLFxuICAgICAgIFtcbiAgICAgICAgIG8uVEhJU19FWFBSLnByb3AoJ3JlbmRlcmVyJylcbiAgICAgICAgICAgICAuY2FsbE1ldGhvZCgnc2V0VGV4dCcsIFtjb21waWxlTm9kZS5yZW5kZXJOb2RlLCBjdXJyVmFsRXhwcl0pXG4gICAgICAgICAgICAgLnRvU3RtdCgpXG4gICAgICAgXSxcbiAgICAgICB2aWV3LmRldGVjdENoYW5nZXNJbklucHV0c01ldGhvZCk7XG59XG5cbmZ1bmN0aW9uIGJpbmRBbmRXcml0ZVRvUmVuZGVyZXIoYm91bmRQcm9wczogQm91bmRFbGVtZW50UHJvcGVydHlBc3RbXSwgY29udGV4dDogby5FeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21waWxlRWxlbWVudDogQ29tcGlsZUVsZW1lbnQpIHtcbiAgdmFyIHZpZXcgPSBjb21waWxlRWxlbWVudC52aWV3O1xuICB2YXIgcmVuZGVyTm9kZSA9IGNvbXBpbGVFbGVtZW50LnJlbmRlck5vZGU7XG4gIGJvdW5kUHJvcHMuZm9yRWFjaCgoYm91bmRQcm9wKSA9PiB7XG4gICAgdmFyIGJpbmRpbmdJbmRleCA9IHZpZXcuYmluZGluZ3MubGVuZ3RoO1xuICAgIHZpZXcuYmluZGluZ3MucHVzaChuZXcgQ29tcGlsZUJpbmRpbmcoY29tcGlsZUVsZW1lbnQsIGJvdW5kUHJvcCkpO1xuICAgIHZpZXcuZGV0ZWN0Q2hhbmdlc0hvc3RQcm9wZXJ0aWVzTWV0aG9kLnJlc2V0RGVidWdJbmZvKGNvbXBpbGVFbGVtZW50Lm5vZGVJbmRleCwgYm91bmRQcm9wKTtcbiAgICB2YXIgZmllbGRFeHByID0gY3JlYXRlQmluZEZpZWxkRXhwcihiaW5kaW5nSW5kZXgpO1xuICAgIHZhciBjdXJyVmFsRXhwciA9IGNyZWF0ZUN1cnJWYWx1ZUV4cHIoYmluZGluZ0luZGV4KTtcbiAgICB2YXIgcmVuZGVyTWV0aG9kOiBzdHJpbmc7XG4gICAgdmFyIHJlbmRlclZhbHVlOiBvLkV4cHJlc3Npb24gPSBjdXJyVmFsRXhwcjtcbiAgICB2YXIgdXBkYXRlU3RtdHMgPSBbXTtcbiAgICBzd2l0Y2ggKGJvdW5kUHJvcC50eXBlKSB7XG4gICAgICBjYXNlIFByb3BlcnR5QmluZGluZ1R5cGUuUHJvcGVydHk6XG4gICAgICAgIHJlbmRlck1ldGhvZCA9ICdzZXRFbGVtZW50UHJvcGVydHknO1xuICAgICAgICBpZiAodmlldy5nZW5Db25maWcubG9nQmluZGluZ1VwZGF0ZSkge1xuICAgICAgICAgIHVwZGF0ZVN0bXRzLnB1c2gobG9nQmluZGluZ1VwZGF0ZVN0bXQocmVuZGVyTm9kZSwgYm91bmRQcm9wLm5hbWUsIGN1cnJWYWxFeHByKSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFByb3BlcnR5QmluZGluZ1R5cGUuQXR0cmlidXRlOlxuICAgICAgICByZW5kZXJNZXRob2QgPSAnc2V0RWxlbWVudEF0dHJpYnV0ZSc7XG4gICAgICAgIHJlbmRlclZhbHVlID1cbiAgICAgICAgICAgIHJlbmRlclZhbHVlLmlzQmxhbmsoKS5jb25kaXRpb25hbChvLk5VTExfRVhQUiwgcmVuZGVyVmFsdWUuY2FsbE1ldGhvZCgndG9TdHJpbmcnLCBbXSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgUHJvcGVydHlCaW5kaW5nVHlwZS5DbGFzczpcbiAgICAgICAgcmVuZGVyTWV0aG9kID0gJ3NldEVsZW1lbnRDbGFzcyc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBQcm9wZXJ0eUJpbmRpbmdUeXBlLlN0eWxlOlxuICAgICAgICByZW5kZXJNZXRob2QgPSAnc2V0RWxlbWVudFN0eWxlJztcbiAgICAgICAgdmFyIHN0clZhbHVlOiBvLkV4cHJlc3Npb24gPSByZW5kZXJWYWx1ZS5jYWxsTWV0aG9kKCd0b1N0cmluZycsIFtdKTtcbiAgICAgICAgaWYgKGlzUHJlc2VudChib3VuZFByb3AudW5pdCkpIHtcbiAgICAgICAgICBzdHJWYWx1ZSA9IHN0clZhbHVlLnBsdXMoby5saXRlcmFsKGJvdW5kUHJvcC51bml0KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVuZGVyVmFsdWUgPSByZW5kZXJWYWx1ZS5pc0JsYW5rKCkuY29uZGl0aW9uYWwoby5OVUxMX0VYUFIsIHN0clZhbHVlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHVwZGF0ZVN0bXRzLnB1c2goXG4gICAgICAgIG8uVEhJU19FWFBSLnByb3AoJ3JlbmRlcmVyJylcbiAgICAgICAgICAgIC5jYWxsTWV0aG9kKHJlbmRlck1ldGhvZCwgW3JlbmRlck5vZGUsIG8ubGl0ZXJhbChib3VuZFByb3AubmFtZSksIHJlbmRlclZhbHVlXSlcbiAgICAgICAgICAgIC50b1N0bXQoKSk7XG5cbiAgICBiaW5kKHZpZXcsIGN1cnJWYWxFeHByLCBmaWVsZEV4cHIsIGJvdW5kUHJvcC52YWx1ZSwgY29udGV4dCwgdXBkYXRlU3RtdHMsXG4gICAgICAgICB2aWV3LmRldGVjdENoYW5nZXNIb3N0UHJvcGVydGllc01ldGhvZCk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmluZFJlbmRlcklucHV0cyhib3VuZFByb3BzOiBCb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcGlsZUVsZW1lbnQ6IENvbXBpbGVFbGVtZW50KTogdm9pZCB7XG4gIGJpbmRBbmRXcml0ZVRvUmVuZGVyZXIoYm91bmRQcm9wcywgby5USElTX0VYUFIucHJvcCgnY29udGV4dCcpLCBjb21waWxlRWxlbWVudCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiaW5kRGlyZWN0aXZlSG9zdFByb3BzKGRpcmVjdGl2ZUFzdDogRGlyZWN0aXZlQXN0LCBkaXJlY3RpdmVJbnN0YW5jZTogby5FeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcGlsZUVsZW1lbnQ6IENvbXBpbGVFbGVtZW50KTogdm9pZCB7XG4gIGJpbmRBbmRXcml0ZVRvUmVuZGVyZXIoZGlyZWN0aXZlQXN0Lmhvc3RQcm9wZXJ0aWVzLCBkaXJlY3RpdmVJbnN0YW5jZSwgY29tcGlsZUVsZW1lbnQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmluZERpcmVjdGl2ZUlucHV0cyhkaXJlY3RpdmVBc3Q6IERpcmVjdGl2ZUFzdCwgZGlyZWN0aXZlSW5zdGFuY2U6IG8uRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBpbGVFbGVtZW50OiBDb21waWxlRWxlbWVudCkge1xuICBpZiAoZGlyZWN0aXZlQXN0LmlucHV0cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHZpZXcgPSBjb21waWxlRWxlbWVudC52aWV3O1xuICB2YXIgZGV0ZWN0Q2hhbmdlc0luSW5wdXRzTWV0aG9kID0gdmlldy5kZXRlY3RDaGFuZ2VzSW5JbnB1dHNNZXRob2Q7XG4gIGRldGVjdENoYW5nZXNJbklucHV0c01ldGhvZC5yZXNldERlYnVnSW5mbyhjb21waWxlRWxlbWVudC5ub2RlSW5kZXgsIGNvbXBpbGVFbGVtZW50LnNvdXJjZUFzdCk7XG5cbiAgdmFyIGxpZmVjeWNsZUhvb2tzID0gZGlyZWN0aXZlQXN0LmRpcmVjdGl2ZS5saWZlY3ljbGVIb29rcztcbiAgdmFyIGNhbGNDaGFuZ2VzTWFwID0gbGlmZWN5Y2xlSG9va3MuaW5kZXhPZihMaWZlY3ljbGVIb29rcy5PbkNoYW5nZXMpICE9PSAtMTtcbiAgdmFyIGlzT25QdXNoQ29tcCA9IGRpcmVjdGl2ZUFzdC5kaXJlY3RpdmUuaXNDb21wb25lbnQgJiZcbiAgICAgICAgICAgICAgICAgICAgICFpc0RlZmF1bHRDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneShkaXJlY3RpdmVBc3QuZGlyZWN0aXZlLmNoYW5nZURldGVjdGlvbik7XG4gIGlmIChjYWxjQ2hhbmdlc01hcCkge1xuICAgIGRldGVjdENoYW5nZXNJbklucHV0c01ldGhvZC5hZGRTdG10KERldGVjdENoYW5nZXNWYXJzLmNoYW5nZXMuc2V0KG8uTlVMTF9FWFBSKS50b1N0bXQoKSk7XG4gIH1cbiAgaWYgKGlzT25QdXNoQ29tcCkge1xuICAgIGRldGVjdENoYW5nZXNJbklucHV0c01ldGhvZC5hZGRTdG10KERldGVjdENoYW5nZXNWYXJzLmNoYW5nZWQuc2V0KG8ubGl0ZXJhbChmYWxzZSkpLnRvU3RtdCgpKTtcbiAgfVxuICBkaXJlY3RpdmVBc3QuaW5wdXRzLmZvckVhY2goKGlucHV0KSA9PiB7XG4gICAgdmFyIGJpbmRpbmdJbmRleCA9IHZpZXcuYmluZGluZ3MubGVuZ3RoO1xuICAgIHZpZXcuYmluZGluZ3MucHVzaChuZXcgQ29tcGlsZUJpbmRpbmcoY29tcGlsZUVsZW1lbnQsIGlucHV0KSk7XG4gICAgZGV0ZWN0Q2hhbmdlc0luSW5wdXRzTWV0aG9kLnJlc2V0RGVidWdJbmZvKGNvbXBpbGVFbGVtZW50Lm5vZGVJbmRleCwgaW5wdXQpO1xuICAgIHZhciBmaWVsZEV4cHIgPSBjcmVhdGVCaW5kRmllbGRFeHByKGJpbmRpbmdJbmRleCk7XG4gICAgdmFyIGN1cnJWYWxFeHByID0gY3JlYXRlQ3VyclZhbHVlRXhwcihiaW5kaW5nSW5kZXgpO1xuICAgIHZhciBzdGF0ZW1lbnRzOiBvLlN0YXRlbWVudFtdID1cbiAgICAgICAgW2RpcmVjdGl2ZUluc3RhbmNlLnByb3AoaW5wdXQuZGlyZWN0aXZlTmFtZSkuc2V0KGN1cnJWYWxFeHByKS50b1N0bXQoKV07XG4gICAgaWYgKGNhbGNDaGFuZ2VzTWFwKSB7XG4gICAgICBzdGF0ZW1lbnRzLnB1c2gobmV3IG8uSWZTdG10KERldGVjdENoYW5nZXNWYXJzLmNoYW5nZXMuaWRlbnRpY2FsKG8uTlVMTF9FWFBSKSwgW1xuICAgICAgICBEZXRlY3RDaGFuZ2VzVmFycy5jaGFuZ2VzLnNldChvLmxpdGVyYWxNYXAoW10sIG5ldyBvLk1hcFR5cGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG8uaW1wb3J0VHlwZShJZGVudGlmaWVycy5TaW1wbGVDaGFuZ2UpKSkpXG4gICAgICAgICAgICAudG9TdG10KClcbiAgICAgIF0pKTtcbiAgICAgIHN0YXRlbWVudHMucHVzaChcbiAgICAgICAgICBEZXRlY3RDaGFuZ2VzVmFycy5jaGFuZ2VzLmtleShvLmxpdGVyYWwoaW5wdXQuZGlyZWN0aXZlTmFtZSkpXG4gICAgICAgICAgICAgIC5zZXQoby5pbXBvcnRFeHByKElkZW50aWZpZXJzLlNpbXBsZUNoYW5nZSkuaW5zdGFudGlhdGUoW2ZpZWxkRXhwciwgY3VyclZhbEV4cHJdKSlcbiAgICAgICAgICAgICAgLnRvU3RtdCgpKTtcbiAgICB9XG4gICAgaWYgKGlzT25QdXNoQ29tcCkge1xuICAgICAgc3RhdGVtZW50cy5wdXNoKERldGVjdENoYW5nZXNWYXJzLmNoYW5nZWQuc2V0KG8ubGl0ZXJhbCh0cnVlKSkudG9TdG10KCkpO1xuICAgIH1cbiAgICBpZiAodmlldy5nZW5Db25maWcubG9nQmluZGluZ1VwZGF0ZSkge1xuICAgICAgc3RhdGVtZW50cy5wdXNoKFxuICAgICAgICAgIGxvZ0JpbmRpbmdVcGRhdGVTdG10KGNvbXBpbGVFbGVtZW50LnJlbmRlck5vZGUsIGlucHV0LmRpcmVjdGl2ZU5hbWUsIGN1cnJWYWxFeHByKSk7XG4gICAgfVxuICAgIGJpbmQodmlldywgY3VyclZhbEV4cHIsIGZpZWxkRXhwciwgaW5wdXQudmFsdWUsIG8uVEhJU19FWFBSLnByb3AoJ2NvbnRleHQnKSwgc3RhdGVtZW50cyxcbiAgICAgICAgIGRldGVjdENoYW5nZXNJbklucHV0c01ldGhvZCk7XG4gIH0pO1xuICBpZiAoaXNPblB1c2hDb21wKSB7XG4gICAgZGV0ZWN0Q2hhbmdlc0luSW5wdXRzTWV0aG9kLmFkZFN0bXQobmV3IG8uSWZTdG10KERldGVjdENoYW5nZXNWYXJzLmNoYW5nZWQsIFtcbiAgICAgIGNvbXBpbGVFbGVtZW50LmdldE9yQ3JlYXRlQXBwRWxlbWVudCgpXG4gICAgICAgICAgLnByb3AoJ2NvbXBvbmVudFZpZXcnKVxuICAgICAgICAgIC5jYWxsTWV0aG9kKCdtYXJrQXNDaGVja09uY2UnLCBbXSlcbiAgICAgICAgICAudG9TdG10KClcbiAgICBdKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbG9nQmluZGluZ1VwZGF0ZVN0bXQocmVuZGVyTm9kZTogby5FeHByZXNzaW9uLCBwcm9wTmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG8uRXhwcmVzc2lvbik6IG8uU3RhdGVtZW50IHtcbiAgcmV0dXJuIG8uVEhJU19FWFBSLnByb3AoJ3JlbmRlcmVyJylcbiAgICAgIC5jYWxsTWV0aG9kKCdzZXRCaW5kaW5nRGVidWdJbmZvJyxcbiAgICAgICAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyTm9kZSxcbiAgICAgICAgICAgICAgICAgICAgby5saXRlcmFsKGBuZy1yZWZsZWN0LSR7Y2FtZWxDYXNlVG9EYXNoQ2FzZShwcm9wTmFtZSl9YCksXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLmlzQmxhbmsoKS5jb25kaXRpb25hbChvLk5VTExfRVhQUiwgdmFsdWUuY2FsbE1ldGhvZCgndG9TdHJpbmcnLCBbXSkpXG4gICAgICAgICAgICAgICAgICBdKVxuICAgICAgLnRvU3RtdCgpO1xufVxuIl19