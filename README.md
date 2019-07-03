# @johanblumenberg/eventemitter-async

Promise based async drop-in replacement for `EventEmitter`

## API

Follows the API specified by https://nodejs.org/api/events.html#events_class_eventemitter

If no asynchronous listeners are added, it works exactly the same as `EventEmitter`.

If asynchronous listeners are added, those will be executed asynchronously before the next listener is executed. This holds both when emitting events using `emitAsync()` and using `emit()`.

An asynchronous event listener is any listener that returns a `Promise`.

### Additions

`emitAsync(event: string, ...args: any[]): Promise<boolean>`

Does the same as `EventEmitter.emit()`, but returns a `Promise` that is resolved once all event listeners are executed.
