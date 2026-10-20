/**
 * Hostinger Compatibility Entry Point
 * -----------------------------------
 * Some Hostinger configurations default to looking for 'app.js' instead of 'server.js'.
 * This file delegates directly to server.js.
 */
require('./server.js');
