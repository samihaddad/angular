import { isPresent, isBlank } from 'angular2/src/facade/lang';
import { ListWrapper } from 'angular2/src/facade/collection';
import * as o from '../output/output_ast';
import { Identifiers, identifierToken } from '../identifiers';
import { EventHandlerVars } from './constants';
import { CompileQuery, createQueryList, addQueryToTokenMap } from './compile_query';
import { CompileMethod } from './compile_method';
import { ViewType } from 'angular2/src/core/linker/view_type';
import { CompileIdentifierMetadata, CompileTokenMap } from '../compile_metadata';
import { getViewFactoryName, injectFromViewParentInjector, getPropertyInView } from './util';
import { bindPipeDestroyLifecycleCallbacks } from './lifecycle_binder';
export class CompilePipe {
    constructor() {
    }
}
export class CompileView {
    constructor(component, genConfig, pipeMetas, styles, viewIndex, declarationElement, templateVariableBindings) {
        this.component = component;
        this.genConfig = genConfig;
        this.pipeMetas = pipeMetas;
        this.styles = styles;
        this.viewIndex = viewIndex;
        this.declarationElement = declarationElement;
        this.templateVariableBindings = templateVariableBindings;
        this.namedAppElements = [];
        this.nodes = [];
        this.rootNodesOrAppElements = [];
        this.bindings = [];
        this.classStatements = [];
        this.eventHandlerMethods = [];
        this.fields = [];
        this.getters = [];
        this.disposables = [];
        this.subscriptions = [];
        this.pipes = new Map();
        this.variables = new Map();
        this.literalArrayCount = 0;
        this.literalMapCount = 0;
        this.createMethod = new CompileMethod(this);
        this.injectorGetMethod = new CompileMethod(this);
        this.updateContentQueriesMethod = new CompileMethod(this);
        this.dirtyParentQueriesMethod = new CompileMethod(this);
        this.updateViewQueriesMethod = new CompileMethod(this);
        this.detectChangesInInputsMethod = new CompileMethod(this);
        this.detectChangesHostPropertiesMethod = new CompileMethod(this);
        this.afterContentLifecycleCallbacksMethod = new CompileMethod(this);
        this.afterViewLifecycleCallbacksMethod = new CompileMethod(this);
        this.destroyMethod = new CompileMethod(this);
        this.viewType = getViewType(component, viewIndex);
        this.className = `_View_${component.type.name}${viewIndex}`;
        this.classType = o.importType(new CompileIdentifierMetadata({ name: this.className }));
        this.viewFactory = o.variable(getViewFactoryName(component, viewIndex));
        if (this.viewType === ViewType.COMPONENT || this.viewType === ViewType.HOST) {
            this.componentView = this;
        }
        else {
            this.componentView = this.declarationElement.view.componentView;
        }
        var viewQueries = new CompileTokenMap();
        if (this.viewType === ViewType.COMPONENT) {
            var directiveInstance = o.THIS_EXPR.prop('context');
            ListWrapper.forEachWithIndex(this.component.viewQueries, (queryMeta, queryIndex) => {
                var propName = `_viewQuery_${queryMeta.selectors[0].name}_${queryIndex}`;
                var queryList = createQueryList(queryMeta, directiveInstance, propName, this);
                var query = new CompileQuery(queryMeta, queryList, directiveInstance, this);
                addQueryToTokenMap(viewQueries, query);
            });
            var constructorViewQueryCount = 0;
            this.component.type.diDeps.forEach((dep) => {
                if (isPresent(dep.viewQuery)) {
                    var queryList = o.THIS_EXPR.prop('declarationAppElement')
                        .prop('componentConstructorViewQueries')
                        .key(o.literal(constructorViewQueryCount++));
                    var query = new CompileQuery(dep.viewQuery, queryList, null, this);
                    addQueryToTokenMap(viewQueries, query);
                }
            });
        }
        this.viewQueries = viewQueries;
        templateVariableBindings.forEach((entry) => {
            this.variables.set(entry[1], o.THIS_EXPR.prop('locals').key(o.literal(entry[0])));
        });
        if (!this.declarationElement.isNull()) {
            this.declarationElement.setEmbeddedView(this);
        }
    }
    createPipe(name) {
        var pipeMeta = this.pipeMetas.find((pipeMeta) => pipeMeta.name == name);
        var pipeFieldName = pipeMeta.pure ? `_pipe_${name}` : `_pipe_${name}_${this.pipes.size}`;
        var pipeExpr = this.pipes.get(pipeFieldName);
        if (isBlank(pipeExpr)) {
            var deps = pipeMeta.type.diDeps.map((diDep) => {
                if (diDep.token.equalsTo(identifierToken(Identifiers.ChangeDetectorRef))) {
                    return o.THIS_EXPR.prop('ref');
                }
                return injectFromViewParentInjector(diDep.token, false);
            });
            this.fields.push(new o.ClassField(pipeFieldName, o.importType(pipeMeta.type), [o.StmtModifier.Private]));
            this.createMethod.resetDebugInfo(null, null);
            this.createMethod.addStmt(o.THIS_EXPR.prop(pipeFieldName)
                .set(o.importExpr(pipeMeta.type).instantiate(deps))
                .toStmt());
            pipeExpr = o.THIS_EXPR.prop(pipeFieldName);
            this.pipes.set(pipeFieldName, pipeExpr);
            bindPipeDestroyLifecycleCallbacks(pipeMeta, pipeExpr, this);
        }
        return pipeExpr;
    }
    getVariable(name) {
        if (name == EventHandlerVars.event.name) {
            return EventHandlerVars.event;
        }
        var currView = this;
        var result = currView.variables.get(name);
        var viewPath = [];
        while (isBlank(result) && isPresent(currView.declarationElement.view)) {
            currView = currView.declarationElement.view;
            result = currView.variables.get(name);
            viewPath.push(currView);
        }
        if (isPresent(result)) {
            return getPropertyInView(result, viewPath);
        }
        else {
            return null;
        }
    }
    createLiteralArray(values) {
        return o.THIS_EXPR.callMethod('literalArray', [o.literal(this.literalArrayCount++), o.literalArr(values)]);
    }
    createLiteralMap(values) {
        return o.THIS_EXPR.callMethod('literalMap', [o.literal(this.literalMapCount++), o.literalMap(values)]);
    }
    afterNodes() {
        this.viewQueries.values().forEach((queries) => queries.forEach((query) => query.afterChildren(this.updateViewQueriesMethod)));
    }
}
function getViewType(component, embeddedTemplateIndex) {
    if (embeddedTemplateIndex > 0) {
        return ViewType.EMBEDDED;
    }
    else if (component.type.isHost) {
        return ViewType.HOST;
    }
    else {
        return ViewType.COMPONENT;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZV92aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGlmZmluZ19wbHVnaW5fd3JhcHBlci1vdXRwdXRfcGF0aC1XRHp1akw4ZC50bXAvYW5ndWxhcjIvc3JjL2NvbXBpbGVyL3ZpZXdfY29tcGlsZXIvY29tcGlsZV92aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJPQUFPLEVBQUMsU0FBUyxFQUFFLE9BQU8sRUFBQyxNQUFNLDBCQUEwQjtPQUNwRCxFQUFDLFdBQVcsRUFBbUIsTUFBTSxnQ0FBZ0M7T0FFckUsS0FBSyxDQUFDLE1BQU0sc0JBQXNCO09BQ2xDLEVBQUMsV0FBVyxFQUFFLGVBQWUsRUFBQyxNQUFNLGdCQUFnQjtPQUNwRCxFQUFDLGdCQUFnQixFQUFDLE1BQU0sYUFBYTtPQUNyQyxFQUFDLFlBQVksRUFBRSxlQUFlLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSxpQkFBaUI7T0FHMUUsRUFBQyxhQUFhLEVBQUMsTUFBTSxrQkFBa0I7T0FDdkMsRUFBQyxRQUFRLEVBQUMsTUFBTSxvQ0FBb0M7T0FDcEQsRUFHTCx5QkFBeUIsRUFDekIsZUFBZSxFQUNoQixNQUFNLHFCQUFxQjtPQUNyQixFQUNMLGtCQUFrQixFQUNsQiw0QkFBNEIsRUFFNUIsaUJBQWlCLEVBQ2xCLE1BQU0sUUFBUTtPQUlSLEVBQUMsaUNBQWlDLEVBQUMsTUFBTSxvQkFBb0I7QUFFcEU7SUFDRTtJQUFlLENBQUM7QUFDbEIsQ0FBQztBQUVEO0lBc0NFLFlBQW1CLFNBQW1DLEVBQVMsU0FBeUIsRUFDckUsU0FBZ0MsRUFBUyxNQUFvQixFQUM3RCxTQUFpQixFQUFTLGtCQUFrQyxFQUM1RCx3QkFBb0M7UUFIcEMsY0FBUyxHQUFULFNBQVMsQ0FBMEI7UUFBUyxjQUFTLEdBQVQsU0FBUyxDQUFnQjtRQUNyRSxjQUFTLEdBQVQsU0FBUyxDQUF1QjtRQUFTLFdBQU0sR0FBTixNQUFNLENBQWM7UUFDN0QsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUFTLHVCQUFr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VUFBVSxDQUFDLFlBQVksRUFDWixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0YsQ0FBQztJQUVELFVBQVU7UUFDUixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FDN0IsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsRyxDQUFDO0FBQ0gsQ0FBQztBQUVELHFCQUFxQixTQUFtQyxFQUFFLHFCQUE2QjtJQUNyRixFQUFFLENBQUMsQ0FBQyxxQkFBcUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO0lBQzNCLENBQUM7SUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO0lBQ3ZCLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNOLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO0lBQzVCLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtpc1ByZXNlbnQsIGlzQmxhbmt9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvbGFuZyc7XG5pbXBvcnQge0xpc3RXcmFwcGVyLCBTdHJpbmdNYXBXcmFwcGVyfSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2NvbGxlY3Rpb24nO1xuXG5pbXBvcnQgKiBhcyBvIGZyb20gJy4uL291dHB1dC9vdXRwdXRfYXN0JztcbmltcG9ydCB7SWRlbnRpZmllcnMsIGlkZW50aWZpZXJUb2tlbn0gZnJvbSAnLi4vaWRlbnRpZmllcnMnO1xuaW1wb3J0IHtFdmVudEhhbmRsZXJWYXJzfSBmcm9tICcuL2NvbnN0YW50cyc7XG5pbXBvcnQge0NvbXBpbGVRdWVyeSwgY3JlYXRlUXVlcnlMaXN0LCBhZGRRdWVyeVRvVG9rZW5NYXB9IGZyb20gJy4vY29tcGlsZV9xdWVyeSc7XG5pbXBvcnQge05hbWVSZXNvbHZlcn0gZnJvbSAnLi9leHByZXNzaW9uX2NvbnZlcnRlcic7XG5pbXBvcnQge0NvbXBpbGVFbGVtZW50LCBDb21waWxlTm9kZX0gZnJvbSAnLi9jb21waWxlX2VsZW1lbnQnO1xuaW1wb3J0IHtDb21waWxlTWV0aG9kfSBmcm9tICcuL2NvbXBpbGVfbWV0aG9kJztcbmltcG9ydCB7Vmlld1R5cGV9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL2xpbmtlci92aWV3X3R5cGUnO1xuaW1wb3J0IHtcbiAgQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhLFxuICBDb21waWxlUGlwZU1ldGFkYXRhLFxuICBDb21waWxlSWRlbnRpZmllck1ldGFkYXRhLFxuICBDb21waWxlVG9rZW5NYXBcbn0gZnJvbSAnLi4vY29tcGlsZV9tZXRhZGF0YSc7XG5pbXBvcnQge1xuICBnZXRWaWV3RmFjdG9yeU5hbWUsXG4gIGluamVjdEZyb21WaWV3UGFyZW50SW5qZWN0b3IsXG4gIGNyZWF0ZURpVG9rZW5FeHByZXNzaW9uLFxuICBnZXRQcm9wZXJ0eUluVmlld1xufSBmcm9tICcuL3V0aWwnO1xuaW1wb3J0IHtDb21waWxlckNvbmZpZ30gZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7Q29tcGlsZUJpbmRpbmd9IGZyb20gJy4vY29tcGlsZV9iaW5kaW5nJztcblxuaW1wb3J0IHtiaW5kUGlwZURlc3Ryb3lMaWZlY3ljbGVDYWxsYmFja3N9IGZyb20gJy4vbGlmZWN5Y2xlX2JpbmRlcic7XG5cbmV4cG9ydCBjbGFzcyBDb21waWxlUGlwZSB7XG4gIGNvbnN0cnVjdG9yKCkge31cbn1cblxuZXhwb3J0IGNsYXNzIENvbXBpbGVWaWV3IGltcGxlbWVudHMgTmFtZVJlc29sdmVyIHtcbiAgcHVibGljIHZpZXdUeXBlOiBWaWV3VHlwZTtcbiAgcHVibGljIHZpZXdRdWVyaWVzOiBDb21waWxlVG9rZW5NYXA8Q29tcGlsZVF1ZXJ5W10+O1xuICBwdWJsaWMgbmFtZWRBcHBFbGVtZW50czogQXJyYXk8QXJyYXk8c3RyaW5nIHwgby5FeHByZXNzaW9uPj4gPSBbXTtcblxuICBwdWJsaWMgbm9kZXM6IENvbXBpbGVOb2RlW10gPSBbXTtcbiAgcHVibGljIHJvb3ROb2Rlc09yQXBwRWxlbWVudHM6IG8uRXhwcmVzc2lvbltdID0gW107XG5cbiAgcHVibGljIGJpbmRpbmdzOiBDb21waWxlQmluZGluZ1tdID0gW107XG5cbiAgcHVibGljIGNsYXNzU3RhdGVtZW50czogby5TdGF0ZW1lbnRbXSA9IFtdO1xuICBwdWJsaWMgY3JlYXRlTWV0aG9kOiBDb21waWxlTWV0aG9kO1xuICBwdWJsaWMgaW5qZWN0b3JHZXRNZXRob2Q6IENvbXBpbGVNZXRob2Q7XG4gIHB1YmxpYyB1cGRhdGVDb250ZW50UXVlcmllc01ldGhvZDogQ29tcGlsZU1ldGhvZDtcbiAgcHVibGljIGRpcnR5UGFyZW50UXVlcmllc01ldGhvZDogQ29tcGlsZU1ldGhvZDtcbiAgcHVibGljIHVwZGF0ZVZpZXdRdWVyaWVzTWV0aG9kOiBDb21waWxlTWV0aG9kO1xuICBwdWJsaWMgZGV0ZWN0Q2hhbmdlc0luSW5wdXRzTWV0aG9kOiBDb21waWxlTWV0aG9kO1xuICBwdWJsaWMgZGV0ZWN0Q2hhbmdlc0hvc3RQcm9wZXJ0aWVzTWV0aG9kOiBDb21waWxlTWV0aG9kO1xuICBwdWJsaWMgYWZ0ZXJDb250ZW50TGlmZWN5Y2xlQ2FsbGJhY2tzTWV0aG9kOiBDb21waWxlTWV0aG9kO1xuICBwdWJsaWMgYWZ0ZXJWaWV3TGlmZWN5Y2xlQ2FsbGJhY2tzTWV0aG9kOiBDb21waWxlTWV0aG9kO1xuICBwdWJsaWMgZGVzdHJveU1ldGhvZDogQ29tcGlsZU1ldGhvZDtcbiAgcHVibGljIGV2ZW50SGFuZGxlck1ldGhvZHM6IG8uQ2xhc3NNZXRob2RbXSA9IFtdO1xuXG4gIHB1YmxpYyBmaWVsZHM6IG8uQ2xhc3NGaWVsZFtdID0gW107XG4gIHB1YmxpYyBnZXR0ZXJzOiBvLkNsYXNzR2V0dGVyW10gPSBbXTtcbiAgcHVibGljIGRpc3Bvc2FibGVzOiBvLkV4cHJlc3Npb25bXSA9IFtdO1xuICBwdWJsaWMgc3Vic2NyaXB0aW9uczogby5FeHByZXNzaW9uW10gPSBbXTtcblxuICBwdWJsaWMgY29tcG9uZW50VmlldzogQ29tcGlsZVZpZXc7XG4gIHB1YmxpYyBwaXBlcyA9IG5ldyBNYXA8c3RyaW5nLCBvLkV4cHJlc3Npb24+KCk7XG4gIHB1YmxpYyB2YXJpYWJsZXMgPSBuZXcgTWFwPHN0cmluZywgby5FeHByZXNzaW9uPigpO1xuICBwdWJsaWMgY2xhc3NOYW1lOiBzdHJpbmc7XG4gIHB1YmxpYyBjbGFzc1R5cGU6IG8uVHlwZTtcbiAgcHVibGljIHZpZXdGYWN0b3J5OiBvLlJlYWRWYXJFeHByO1xuXG4gIHB1YmxpYyBsaXRlcmFsQXJyYXlDb3VudCA9IDA7XG4gIHB1YmxpYyBsaXRlcmFsTWFwQ291bnQgPSAwO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb21wb25lbnQ6IENvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YSwgcHVibGljIGdlbkNvbmZpZzogQ29tcGlsZXJDb25maWcsXG4gICAgICAgICAgICAgIHB1YmxpYyBwaXBlTWV0YXM6IENvbXBpbGVQaXBlTWV0YWRhdGFbXSwgcHVibGljIHN0eWxlczogby5FeHByZXNzaW9uLFxuICAgICAgICAgICAgICBwdWJsaWMgdmlld0luZGV4OiBudW1iZXIsIHB1YmxpYyBkZWNsYXJhdGlvbkVsZW1lbnQ6IENvbXBpbGVFbGVtZW50LFxuICAgICAgICAgICAgICBwdWJsaWMgdGVtcGxhdGVWYXJpYWJsZUJpbmRpbmdzOiBzdHJpbmdbXVtdKSB7XG4gICAgdGhpcy5jcmVhdGVNZXRob2QgPSBuZXcgQ29tcGlsZU1ldGhvZCh0aGlzKTtcbiAgICB0aGlzLmluamVjdG9yR2V0TWV0aG9kID0gbmV3IENvbXBpbGVNZXRob2QodGhpcyk7XG4gICAgdGhpcy51cGRhdGVDb250ZW50UXVlcmllc01ldGhvZCA9IG5ldyBDb21waWxlTWV0aG9kKHRoaXMpO1xuICAgIHRoaXMuZGlydHlQYXJlbnRRdWVyaWVzTWV0aG9kID0gbmV3IENvbXBpbGVNZXRob2QodGhpcyk7XG4gICAgdGhpcy51cGRhdGVWaWV3UXVlcmllc01ldGhvZCA9IG5ldyBDb21waWxlTWV0aG9kKHRoaXMpO1xuICAgIHRoaXMuZGV0ZWN0Q2hhbmdlc0luSW5wdXRzTWV0aG9kID0gbmV3IENvbXBpbGVNZXRob2QodGhpcyk7XG4gICAgdGhpcy5kZXRlY3RDaGFuZ2VzSG9zdFByb3BlcnRpZXNNZXRob2QgPSBuZXcgQ29tcGlsZU1ldGhvZCh0aGlzKTtcblxuICAgIHRoaXMuYWZ0ZXJDb250ZW50TGlmZWN5Y2xlQ2FsbGJhY2tzTWV0aG9kID0gbmV3IENvbXBpbGVNZXRob2QodGhpcyk7XG4gICAgdGhpcy5hZnRlclZpZXdMaWZlY3ljbGVDYWxsYmFja3NNZXRob2QgPSBuZXcgQ29tcGlsZU1ldGhvZCh0aGlzKTtcbiAgICB0aGlzLmRlc3Ryb3lNZXRob2QgPSBuZXcgQ29tcGlsZU1ldGhvZCh0aGlzKTtcblxuICAgIHRoaXMudmlld1R5cGUgPSBnZXRWaWV3VHlwZShjb21wb25lbnQsIHZpZXdJbmRleCk7XG4gICAgdGhpcy5jbGFzc05hbWUgPSBgX1ZpZXdfJHtjb21wb25lbnQudHlwZS5uYW1lfSR7dmlld0luZGV4fWA7XG4gICAgdGhpcy5jbGFzc1R5cGUgPSBvLmltcG9ydFR5cGUobmV3IENvbXBpbGVJZGVudGlmaWVyTWV0YWRhdGEoe25hbWU6IHRoaXMuY2xhc3NOYW1lfSkpO1xuICAgIHRoaXMudmlld0ZhY3RvcnkgPSBvLnZhcmlhYmxlKGdldFZpZXdGYWN0b3J5TmFtZShjb21wb25lbnQsIHZpZXdJbmRleCkpO1xuICAgIGlmICh0aGlzLnZpZXdUeXBlID09PSBWaWV3VHlwZS5DT01QT05FTlQgfHwgdGhpcy52aWV3VHlwZSA9PT0gVmlld1R5cGUuSE9TVCkge1xuICAgICAgdGhpcy5jb21wb25lbnRWaWV3ID0gdGhpcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb21wb25lbnRWaWV3ID0gdGhpcy5kZWNsYXJhdGlvbkVsZW1lbnQudmlldy5jb21wb25lbnRWaWV3O1xuICAgIH1cbiAgICB2YXIgdmlld1F1ZXJpZXMgPSBuZXcgQ29tcGlsZVRva2VuTWFwPENvbXBpbGVRdWVyeVtdPigpO1xuICAgIGlmICh0aGlzLnZpZXdUeXBlID09PSBWaWV3VHlwZS5DT01QT05FTlQpIHtcbiAgICAgIHZhciBkaXJlY3RpdmVJbnN0YW5jZSA9IG8uVEhJU19FWFBSLnByb3AoJ2NvbnRleHQnKTtcbiAgICAgIExpc3RXcmFwcGVyLmZvckVhY2hXaXRoSW5kZXgodGhpcy5jb21wb25lbnQudmlld1F1ZXJpZXMsIChxdWVyeU1ldGEsIHF1ZXJ5SW5kZXgpID0+IHtcbiAgICAgICAgdmFyIHByb3BOYW1lID0gYF92aWV3UXVlcnlfJHtxdWVyeU1ldGEuc2VsZWN0b3JzWzBdLm5hbWV9XyR7cXVlcnlJbmRleH1gO1xuICAgICAgICB2YXIgcXVlcnlMaXN0ID0gY3JlYXRlUXVlcnlMaXN0KHF1ZXJ5TWV0YSwgZGlyZWN0aXZlSW5zdGFuY2UsIHByb3BOYW1lLCB0aGlzKTtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gbmV3IENvbXBpbGVRdWVyeShxdWVyeU1ldGEsIHF1ZXJ5TGlzdCwgZGlyZWN0aXZlSW5zdGFuY2UsIHRoaXMpO1xuICAgICAgICBhZGRRdWVyeVRvVG9rZW5NYXAodmlld1F1ZXJpZXMsIHF1ZXJ5KTtcbiAgICAgIH0pO1xuICAgICAgdmFyIGNvbnN0cnVjdG9yVmlld1F1ZXJ5Q291bnQgPSAwO1xuICAgICAgdGhpcy5jb21wb25lbnQudHlwZS5kaURlcHMuZm9yRWFjaCgoZGVwKSA9PiB7XG4gICAgICAgIGlmIChpc1ByZXNlbnQoZGVwLnZpZXdRdWVyeSkpIHtcbiAgICAgICAgICB2YXIgcXVlcnlMaXN0ID0gby5USElTX0VYUFIucHJvcCgnZGVjbGFyYXRpb25BcHBFbGVtZW50JylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5wcm9wKCdjb21wb25lbnRDb25zdHJ1Y3RvclZpZXdRdWVyaWVzJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5rZXkoby5saXRlcmFsKGNvbnN0cnVjdG9yVmlld1F1ZXJ5Q291bnQrKykpO1xuICAgICAgICAgIHZhciBxdWVyeSA9IG5ldyBDb21waWxlUXVlcnkoZGVwLnZpZXdRdWVyeSwgcXVlcnlMaXN0LCBudWxsLCB0aGlzKTtcbiAgICAgICAgICBhZGRRdWVyeVRvVG9rZW5NYXAodmlld1F1ZXJpZXMsIHF1ZXJ5KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHRoaXMudmlld1F1ZXJpZXMgPSB2aWV3UXVlcmllcztcbiAgICB0ZW1wbGF0ZVZhcmlhYmxlQmluZGluZ3MuZm9yRWFjaCgoZW50cnkpID0+IHtcbiAgICAgIHRoaXMudmFyaWFibGVzLnNldChlbnRyeVsxXSwgby5USElTX0VYUFIucHJvcCgnbG9jYWxzJykua2V5KG8ubGl0ZXJhbChlbnRyeVswXSkpKTtcbiAgICB9KTtcblxuICAgIGlmICghdGhpcy5kZWNsYXJhdGlvbkVsZW1lbnQuaXNOdWxsKCkpIHtcbiAgICAgIHRoaXMuZGVjbGFyYXRpb25FbGVtZW50LnNldEVtYmVkZGVkVmlldyh0aGlzKTtcbiAgICB9XG4gIH1cblxuICBjcmVhdGVQaXBlKG5hbWU6IHN0cmluZyk6IG8uRXhwcmVzc2lvbiB7XG4gICAgdmFyIHBpcGVNZXRhOiBDb21waWxlUGlwZU1ldGFkYXRhID0gdGhpcy5waXBlTWV0YXMuZmluZCgocGlwZU1ldGEpID0+IHBpcGVNZXRhLm5hbWUgPT0gbmFtZSk7XG4gICAgdmFyIHBpcGVGaWVsZE5hbWUgPSBwaXBlTWV0YS5wdXJlID8gYF9waXBlXyR7bmFtZX1gIDogYF9waXBlXyR7bmFtZX1fJHt0aGlzLnBpcGVzLnNpemV9YDtcbiAgICB2YXIgcGlwZUV4cHIgPSB0aGlzLnBpcGVzLmdldChwaXBlRmllbGROYW1lKTtcbiAgICBpZiAoaXNCbGFuayhwaXBlRXhwcikpIHtcbiAgICAgIHZhciBkZXBzID0gcGlwZU1ldGEudHlwZS5kaURlcHMubWFwKChkaURlcCkgPT4ge1xuICAgICAgICBpZiAoZGlEZXAudG9rZW4uZXF1YWxzVG8oaWRlbnRpZmllclRva2VuKElkZW50aWZpZXJzLkNoYW5nZURldGVjdG9yUmVmKSkpIHtcbiAgICAgICAgICByZXR1cm4gby5USElTX0VYUFIucHJvcCgncmVmJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluamVjdEZyb21WaWV3UGFyZW50SW5qZWN0b3IoZGlEZXAudG9rZW4sIGZhbHNlKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5maWVsZHMucHVzaChcbiAgICAgICAgICBuZXcgby5DbGFzc0ZpZWxkKHBpcGVGaWVsZE5hbWUsIG8uaW1wb3J0VHlwZShwaXBlTWV0YS50eXBlKSwgW28uU3RtdE1vZGlmaWVyLlByaXZhdGVdKSk7XG4gICAgICB0aGlzLmNyZWF0ZU1ldGhvZC5yZXNldERlYnVnSW5mbyhudWxsLCBudWxsKTtcbiAgICAgIHRoaXMuY3JlYXRlTWV0aG9kLmFkZFN0bXQoby5USElTX0VYUFIucHJvcChwaXBlRmllbGROYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnNldChvLmltcG9ydEV4cHIocGlwZU1ldGEudHlwZSkuaW5zdGFudGlhdGUoZGVwcykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudG9TdG10KCkpO1xuICAgICAgcGlwZUV4cHIgPSBvLlRISVNfRVhQUi5wcm9wKHBpcGVGaWVsZE5hbWUpO1xuICAgICAgdGhpcy5waXBlcy5zZXQocGlwZUZpZWxkTmFtZSwgcGlwZUV4cHIpO1xuICAgICAgYmluZFBpcGVEZXN0cm95TGlmZWN5Y2xlQ2FsbGJhY2tzKHBpcGVNZXRhLCBwaXBlRXhwciwgdGhpcyk7XG4gICAgfVxuICAgIHJldHVybiBwaXBlRXhwcjtcbiAgfVxuXG4gIGdldFZhcmlhYmxlKG5hbWU6IHN0cmluZyk6IG8uRXhwcmVzc2lvbiB7XG4gICAgaWYgKG5hbWUgPT0gRXZlbnRIYW5kbGVyVmFycy5ldmVudC5uYW1lKSB7XG4gICAgICByZXR1cm4gRXZlbnRIYW5kbGVyVmFycy5ldmVudDtcbiAgICB9XG4gICAgdmFyIGN1cnJWaWV3OiBDb21waWxlVmlldyA9IHRoaXM7XG4gICAgdmFyIHJlc3VsdCA9IGN1cnJWaWV3LnZhcmlhYmxlcy5nZXQobmFtZSk7XG4gICAgdmFyIHZpZXdQYXRoID0gW107XG4gICAgd2hpbGUgKGlzQmxhbmsocmVzdWx0KSAmJiBpc1ByZXNlbnQoY3VyclZpZXcuZGVjbGFyYXRpb25FbGVtZW50LnZpZXcpKSB7XG4gICAgICBjdXJyVmlldyA9IGN1cnJWaWV3LmRlY2xhcmF0aW9uRWxlbWVudC52aWV3O1xuICAgICAgcmVzdWx0ID0gY3VyclZpZXcudmFyaWFibGVzLmdldChuYW1lKTtcbiAgICAgIHZpZXdQYXRoLnB1c2goY3VyclZpZXcpO1xuICAgIH1cbiAgICBpZiAoaXNQcmVzZW50KHJlc3VsdCkpIHtcbiAgICAgIHJldHVybiBnZXRQcm9wZXJ0eUluVmlldyhyZXN1bHQsIHZpZXdQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgY3JlYXRlTGl0ZXJhbEFycmF5KHZhbHVlczogby5FeHByZXNzaW9uW10pOiBvLkV4cHJlc3Npb24ge1xuICAgIHJldHVybiBvLlRISVNfRVhQUi5jYWxsTWV0aG9kKCdsaXRlcmFsQXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtvLmxpdGVyYWwodGhpcy5saXRlcmFsQXJyYXlDb3VudCsrKSwgby5saXRlcmFsQXJyKHZhbHVlcyldKTtcbiAgfVxuICBjcmVhdGVMaXRlcmFsTWFwKHZhbHVlczogQXJyYXk8QXJyYXk8c3RyaW5nIHwgby5FeHByZXNzaW9uPj4pOiBvLkV4cHJlc3Npb24ge1xuICAgIHJldHVybiBvLlRISVNfRVhQUi5jYWxsTWV0aG9kKCdsaXRlcmFsTWFwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbby5saXRlcmFsKHRoaXMubGl0ZXJhbE1hcENvdW50KyspLCBvLmxpdGVyYWxNYXAodmFsdWVzKV0pO1xuICB9XG5cbiAgYWZ0ZXJOb2RlcygpIHtcbiAgICB0aGlzLnZpZXdRdWVyaWVzLnZhbHVlcygpLmZvckVhY2goXG4gICAgICAgIChxdWVyaWVzKSA9PiBxdWVyaWVzLmZvckVhY2goKHF1ZXJ5KSA9PiBxdWVyeS5hZnRlckNoaWxkcmVuKHRoaXMudXBkYXRlVmlld1F1ZXJpZXNNZXRob2QpKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0Vmlld1R5cGUoY29tcG9uZW50OiBDb21waWxlRGlyZWN0aXZlTWV0YWRhdGEsIGVtYmVkZGVkVGVtcGxhdGVJbmRleDogbnVtYmVyKTogVmlld1R5cGUge1xuICBpZiAoZW1iZWRkZWRUZW1wbGF0ZUluZGV4ID4gMCkge1xuICAgIHJldHVybiBWaWV3VHlwZS5FTUJFRERFRDtcbiAgfSBlbHNlIGlmIChjb21wb25lbnQudHlwZS5pc0hvc3QpIHtcbiAgICByZXR1cm4gVmlld1R5cGUuSE9TVDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gVmlld1R5cGUuQ09NUE9ORU5UO1xuICB9XG59XG4iXX0=