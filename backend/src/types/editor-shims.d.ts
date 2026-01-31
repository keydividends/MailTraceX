// Temporary editor shims for TypeScript while dependencies are not installed.
// Remove this file after running `npm install` in the `backend` folder.

declare module 'ioredis';

// Minimal `path` shim for the editor. Real types come from `@types/node`.
declare module 'path' {
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
}

// Minimal `dotenv` shim so `dotenv.config()` is callable in the editor.
declare module 'dotenv' {
  export interface DotenvConfigOptions {
    path?: string;
    encoding?: string;
  }
  export function config(opts?: DotenvConfigOptions): { parsed?: { [k: string]: string } } | undefined;
  export = config;
}

declare var process: {
  env: { [key: string]: string | undefined };
  argv: string[];
  cwd?: () => string;
};

// Minimal express shim for editor while types are not installed.
declare module 'express' {
  export type Request = any;
  export type Response = any;
  export function Router(): any;
  const express: any;
  export default express;
}
