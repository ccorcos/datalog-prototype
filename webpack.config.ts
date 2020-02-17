import * as path from "path"
import * as HtmlWebpackPlugin from "html-webpack-plugin"
import { Configuration } from "webpack"

const config: Configuration = {
	entry: "./src/client/main.ts",
	resolve: {
		extensions: [".js", ".ts", ".tsx"],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				exclude: /node_modules/,
				use: [
					{
						loader: "ts-loader",
						options: { configFile: "tsconfig.client.json" },
					},
				],
			},
		],
	},
	cache: true,
	devtool: "source-map",
	output: {
		path: path.join(__dirname, "build/client"),
		filename: "[name]-[chunkhash].js",
		chunkFilename: "[name]-[chunkhash].js",
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: path.join(__dirname, "src/client/index.html"),
		}),
	],
}

// Dev server configs aren't typed properly.
Object.assign(config, {
	devServer: {
		publicPath: "/",
		historyApiFallback: true,
	},
})

export default config
