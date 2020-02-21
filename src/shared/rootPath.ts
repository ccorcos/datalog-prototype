import * as path from "path"
import * as _ from "lodash"

/** A cross-platform paths starting from this root directory. */
export function rootPath(...paths: Array<string>) {
	// Don't add the root to absolute paths
	if (
		// Unix absolute path
		paths[0][0] === "/" ||
		// DOS absolute path, e.g. C:\\
		paths[0][1] === ":"
	) {
		return path.join(...paths)
	}
	const root = path.resolve(__dirname, "..", "..")
	return path.join(root, ...paths)
}
