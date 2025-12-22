const path = require("path");

module.exports = {
	mode: process.env.NODE_ENV == null ? "development" : process.env.NODE_ENV,
	entry: {
		bundle: path.resolve(__dirname, "src", "main.ts"),
	},
	output: {
		path: path.resolve(__dirname, "script"),
		libraryTarget: "umd",
		globalObject: "this",
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: "ts-loader",
			},
		],
	},
	resolve: {
		extensions: [".ts", ".js"],
	},
};
