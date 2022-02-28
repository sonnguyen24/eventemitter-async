import { fnmock, instance, verify, when, defer, nextTick, anything } from '@sym20/ts-mockito';
import { EventEmitter } from "events";
import * as assert from "assert";
import EventEmitterAsync from '../src/EventEmitterAsync';

//
// Run tests on both implementations, to make sure all assumptions
// about EventEmitter are accurate
//
[ EventEmitter, EventEmitterAsync ].forEach(Impl => {
    describe(Impl.name, () => {
        let emitter: EventEmitter;

        beforeEach(() => {
            emitter = new Impl();
        });

        it('should pass same arguments to listener', () => {
            let fn: (a: any, b: any, c: any) => void = fnmock();
            emitter.on('test', instance(fn));

            let a = {}, b: any[] = [], c = undefined;
            emitter.emit('test', a, b, c);
            verify(fn(a, b, c)).called();
        });

        it.skip('should pass this arguments to listener', () => {
            let fn: () => void = fnmock();
            emitter.on('test', instance(fn));

            when(fn()).thenCall(function (this: any) {
                assert(this === emitter);
            });
            emitter.emit('test');
            verify(fn()).called();
        });

        it('should invoke on() multiple times', () => {
            let fn: () => void = fnmock();
            emitter.on('test', instance(fn));

            emitter.emit('test');
            emitter.emit('test');
            verify(fn()).twice();
        });

        it('should disable listener using off()', () => {
            let fn: () => void = fnmock();
            emitter.on('test', instance(fn));

            emitter.emit('test');
            emitter.off('test', instance(fn));
            emitter.emit('test');
            verify(fn()).once();
        });

        it('should disable listener using removeListener()', () => {
            let fn: () => void = fnmock();
            emitter.on('test', instance(fn));

            emitter.emit('test');
            emitter.removeListener('test', instance(fn));
            emitter.emit('test');
            verify(fn()).once();
        });

        it('should invoke once() once', () => {
            let fn: () => void = fnmock();
            emitter.once('test', instance(fn));

            emitter.emit('test');
            emitter.emit('test');
            verify(fn()).once();
        });

        it('should invoke listeners in the order they are added', () => {
            let fn1: () => void = fnmock();
            emitter.on('test', instance(fn1));
            let fn2: () => void = fnmock();
            emitter.on('test', instance(fn2));

            emitter.emit('test');
            verify(fn1()).once();
            verify(fn2()).once();
            verify(fn2()).calledAfter(fn1());
        });

        it('should invoke prepended listener before other listeners', () => {
            let fn1: () => void = fnmock();
            emitter.on('test', instance(fn1));
            let fn2: () => void = fnmock();
            emitter.prependListener('test', instance(fn2));

            emitter.emit('test');
            verify(fn1()).once();
            verify(fn2()).once();
            verify(fn2()).calledBefore(fn1());
        });

        it('should return true if there are listeners', () => {
            let fn: () => void = fnmock();
            emitter.on('test', instance(fn));

            let ret = emitter.emit('test');
            assert(ret === true);
        });

        it('should return false if there are no listeners', () => {
            let ret = emitter.emit('test');
            assert(ret === false);
        });

        it('should not invoke other listeners if one throws', () => {
            let fn1: () => void = fnmock();
            emitter.on('test', instance(fn1));
            let fn2: () => void = fnmock();
            emitter.on('test', instance(fn2));

            when(fn1()).thenThrow(new Error('knas'));

            assert.throws(() => emitter.emit('test'));

            verify(fn1()).once();
            verify(fn2()).never();
        });
    });
});

describe('EventEmitterAsync', () => {
    let emitter: EventEmitterAsync;

    beforeEach(() => {
        emitter = new EventEmitterAsync();
    });

    describe('emit()', () => {
        it('should invoke async listeners in order', async () => {
            let d = defer<void>();
            let fn1: () => Promise<void> = fnmock();
            emitter.on('test', instance(fn1));
            let fn2: () => Promise<void> = fnmock();
            emitter.on('test', instance(fn2));

            when(fn1()).thenReturn(d);
            emitter.emit('test');

            verify(fn1()).once();
            verify(fn2()).never();

            d.resolve();
            await nextTick();
            verify(fn1()).once();
            verify(fn2()).once();
        });
    });

    describe('emitAsync()', () => {
        let r: (ret: boolean) => void;

        beforeEach(() => {
            r = fnmock();
        });

        it('should not resolve until event is handled', async () => {
            let d = defer<void>();
            let fn: () => Promise<void> = fnmock();
            when(fn()).thenReturn(d);

            emitter.on('test', instance(fn));
            emitter.emitAsync('test').then(instance(r));

            await nextTick();
            verify(fn()).once();
            verify(r(anything())).never();

            d.resolve();
            await nextTick();
            verify(fn()).called();
            verify(r(true)).called();
        });

        it('should handle sync functions', async () => {
            let sfn: () => void = fnmock();
            emitter.on('test', instance(sfn));
            emitter.emitAsync('test').then(instance(r));

            await nextTick();
            verify(r(true)).called();
        });

        it('should resolve to true if there are listeners', async () => {
            let fn: () => Promise<void> = fnmock();
            when(fn()).thenResolve();
            emitter.on('test', instance(fn));

            let ret = await emitter.emitAsync('test');
            assert(ret === true);
        });

        it('should resolve to false if there are no listeners', async () => {
            let ret = await emitter.emitAsync('test');
            assert(ret === false);
        });

        it('should not invoke other listeners if one throws', async () => {
            let fn1: () => Promise<void> = fnmock();
            emitter.on('test', instance(fn1));
            let fn2: () => Promise<void> = fnmock();
            emitter.on('test', instance(fn2));

            when(fn1()).thenThrow(new Error('knas'));

            await assert.rejects(() => emitter.emitAsync('test'));

            verify(fn1()).once();
            verify(fn2()).never();
        });

        it('should not invoke other listeners if one rejects', async () => {
            let fn1: () => Promise<void> = fnmock();
            emitter.on('test', instance(fn1));
            let fn2: () => Promise<void> = fnmock();
            emitter.on('test', instance(fn2));

            when(fn1()).thenReject(new Error('knas'));

            await assert.rejects(() => emitter.emitAsync('test'));

            verify(fn1()).once();
            verify(fn2()).never();
        });

        it('should reject if first listener rejects', async () => {
            let fn1: () => Promise<void> = fnmock();
            emitter.on('test', instance(fn1));
            let fn2: () => Promise<void> = fnmock();
            emitter.on('test', instance(fn2));

            when(fn1()).thenReject(new Error('knas'));

            await assert.rejects(() => emitter.emitAsync('test'));

            verify(fn1()).once();
            verify(fn2()).never();
        });

        it('should reject if second listener rejects', async () => {
            let fn1: () => Promise<void> = fnmock();
            emitter.on('test', instance(fn1));
            let fn2: () => Promise<void> = fnmock();
            emitter.on('test', instance(fn2));

            when(fn1()).thenResolve();
            when(fn2()).thenReject(new Error('knas'));

            await assert.rejects(() => emitter.emitAsync('test'));

            verify(fn1()).once();
            verify(fn2()).once();
        });

        it('should reject if first listener throws', async () => {
            let fn1: () => Promise<void> = fnmock();
            emitter.on('test', instance(fn1));
            let fn2: () => Promise<void> = fnmock();
            emitter.on('test', instance(fn2));

            when(fn1()).thenThrow(new Error('knas'));

            await assert.rejects(() => emitter.emitAsync('test'));

            verify(fn1()).once();
            verify(fn2()).never();
        });

        it('should reject if second listener throws', async () => {
            let fn1: () => Promise<void> = fnmock();
            emitter.on('test', instance(fn1));
            let fn2: () => Promise<void> = fnmock();
            emitter.on('test', instance(fn2));

            when(fn1()).thenResolve();
            when(fn2()).thenThrow(new Error('knas'));

            await assert.rejects(() => emitter.emitAsync('test'));

            verify(fn1()).once();
            verify(fn2()).once();
        });
    });
});
