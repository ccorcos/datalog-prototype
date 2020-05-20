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
		const deferred = new DeferredPromise<R>()
		this.queue.push({ value, deferred })
		this.flush()
		return deferred.promise
	}

	private running = 0

	private async flush() {
		if (this.queue.length === 0) {
			return
		}
		if (this.running >= this.parallel) {
			return
		}

		const batch = this.queue.splice(0, this.batchSize)
		try {
			const results = await this.dequeue(batch.map(({ value }) => value))
			for (let i = 0; i < batch.length; i++) {
				batch[i].deferred.resolve(results[i])
			}
		} catch (error) {
			for (const { deferred } of batch) {
				deferred.reject(error)
			}
		}
		this.flush()
	}
}
