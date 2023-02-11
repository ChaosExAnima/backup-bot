import { build } from 'esbuild';

await build({
	entryPoints: ['index.ts'],
	outfile: 'backup.js',
	bundle: true,
	target: 'node18',
	format: 'esm',
	platform: 'node',
	banner: {
		js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
	},
});
