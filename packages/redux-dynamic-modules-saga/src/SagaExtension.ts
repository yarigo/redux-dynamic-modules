import {
    default as createSagaMiddleware,
    SagaMiddleware,
    Task,
} from "redux-saga";
import {
    IExtension,
    getRefCountedManager,
    IModuleManager,
    IMap,
} from "redux-dynamic-modules-core";
import { ISagaRegistration, ISagaModule } from "./Contracts";
import { getSagaManager, ISagaItemManager } from "./SagaManager";
import { sagaEquals } from "./SagaComparer";

export interface ISagaExtension extends IExtension {
    tasks: IMap<ISagaRegistration<any>, Task>;
}

/**
 * Get an extension that integrates saga with the store
 * @param sagaContext The context to provide to the saga
 */
export function getSagaExtension<C>(
    sagaContext?: C,
    onError?: (error: Error) => void
): ISagaExtension {
    let sagaMonitor = undefined;

    //@ts-ignore
    if (
        process.env.NODE_ENV === "development" &&
        typeof window !== "undefined"
    ) {
        sagaMonitor = window["__SAGA_MONITOR_EXTENSION__"] || undefined;
    }

    // Setup the saga middleware
    let sagaMiddleware: SagaMiddleware<C> = createSagaMiddleware<any>({
        context: sagaContext,
        sagaMonitor,
        onError,
    });

    let _sagaManager: ISagaItemManager<
        ISagaRegistration<any>
    > = getRefCountedManager(getSagaManager(sagaMiddleware), sagaEquals);

    return {
        tasks: _sagaManager.tasks,

        middleware: [sagaMiddleware],

        onModuleManagerCreated: (moduleManager: IModuleManager) => {
            if (sagaContext) {
                sagaContext["moduleManager"] = moduleManager;
            }
        },

        onModuleAdded: (module: ISagaModule<any>): void => {
            if (module.sagas) {
                _sagaManager.add(module.sagas);
            }
        },

        onModuleRemoved: (module: ISagaModule<any>): void => {
            if (module.sagas) {
                _sagaManager.remove(module.sagas);
            }
        },

        dispose: () => {
            _sagaManager.dispose();
        },
    };
}
