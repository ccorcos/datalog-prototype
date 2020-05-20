/*

	BatchedQueue.

*/

import { DeferredPromise } from "./promise"

export class BatchedQueue<T, R> {
	private queue: Array<{ value: T; deferred: DeferredPromise<R> }> = []

	constructor(
		private dequeue: (batch: Array<T>) => Promise<Array<R>>,
		private batchSize: number,
		private parallel: number = 1
	) {}

	public enqueue(value: T): Promise<R> {
		console.log("enqueue")
		const deferred = new DeferredPromise<R>()
		this.queue.push({ value, deferred })
		setTimeout(() => {
			this.flush()
		}, 0)
		return deferred.promise
	}

	private running = 0

	private onEmptyPromises: Array<DeferredPromise<void>> = []
	public onEmpty() {
		const deferred = new DeferredPromise<void>()
		this.onEmptyPromises.push(deferred)
		return deferred.promise
	}

	private async flush() {
		if (this.queue.length === 0) {
			for (const deferred of this.onEmptyPromises) {
				deferred.resolve()
			}
			this.onEmptyPromises = []
			console.log("done")
			return
		}
		if (this.running >= this.parallel) {
			console.log("limit")
			return
		}
		this.running += 1
		const batch = this.queue.splice(0, this.batchSize)
		console.log("batch", batch)
		try {
			const results = await this.dequeue(batch.map(({ value }) => value))
			for (let i = 0; i < batch.length; i++) {
				batch[i].deferred.resolve(results[i])
			}
			console.log("success", batch.length)
		} catch (error) {
			for (const { deferred } of batch) {
				deferred.reject(error)
			}
			console.log("error", error)
		}
		this.running -= 1
		this.flush()
	}
}
