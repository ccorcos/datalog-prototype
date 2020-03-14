import { DeferredPromise } from "../../shared/promise"

export async function uploadFile(args: {
	id: string
	ext: string
	file: File
	onStart?: (file: File) => void
	onProgress?: (fraction: number) => void
}) {
	const { id, ext, file, onProgress } = args

	// file.name
	// file.size -> btypes

	const deferred = new DeferredPromise<void>()

	const xhr = new XMLHttpRequest()
	xhr.open("put", `/file/${id}.${ext}`)
	// const fileType = file.type || "text/plain; charset=utf-8"
	// xhr.setRequestHeader("content-type", fileType)

	if (onProgress) {
		xhr.upload.addEventListener("progress", (e: any) => {
			if (e.lengthComputable) {
				const fraction = Math.round((e.loaded * 100) / e.total)
				onProgress(fraction)
			}
		})
	}

	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				deferred.resolve()
			} else {
				deferred.reject(
					new Error("Unknown: " + xhr.status + " " + xhr.responseText)
				)
			}
		}
	}

	xhr.send(file)
	await deferred.promise
}
