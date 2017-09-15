var path = require('path');
var CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
	entry: './src/main.js',
	devtool: 'inline-source-map',
	devServer: {
		contentBase: './dist'
	},
	output: {
		path: path.join(__dirname, 'dist'),
		filename: 'bundle.js'
	},
	module: {
		loaders: [
			{ test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' },
			{ test: /\.css$/, use: ['style-loader', 'css-loader'] },
			{ test: /\.png$/, loader: 'file-loader' },
			{ test: /\.html$/, use: ['file-loader?name=[name].[ext]', 'extract-loader', 'html-loader'] }
		]
	},
	plugins: [
		new CleanWebpackPlugin(['dist'])
	],
	// fix issue with missing 'net' and 'tls'
	node: {
		net: 'empty',
		tls: 'empty'
	}
};
