// The browser build of sql.js has the same API as the package entry point.
declare module 'sql.js/dist/sql-wasm-browser.js' {
  import initSqlJs from 'sql.js';

  export default initSqlJs;
}
