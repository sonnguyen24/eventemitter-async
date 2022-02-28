import { EventEmitter } from "events";

export default class EventEmitterAsync extends EventEmitter {
    // tslint:disable-next-line:ban-types Function is used by EventEmitter.emit()
    private _emit(listeners: Function[], event: string, args: any[]): Promise<void> {
        let fn = listeners.shift();

        if (fn) {
            let result = fn.apply(this, args);
            if (result instanceof Promise) {
                return result.then(() => {
                    return this._emit(listeners, event, args);
                });
            } else {
                return this._emit(listeners, event, args);
            }
        } else {
            return Promise.resolve();
        }
    }

    public emit(event: string, ...args: any[]): boolean {
        let listeners = this.rawListeners(event);
        let result = listeners.length > 0;
        // tslint:disable-next-line:no-floating-promises
        this._emit(listeners, event, args);
        return result;
    }

    public emitAsync(event: string, ...args: any[]): Promise<boolean> {
        let listeners = this.rawListeners(event);
        let result = listeners.length > 0;
        try {
            return this._emit(listeners, event, args).then(function() { return result; });
        } catch (err) {
            return Promise.reject(err);
        }
    }
}
