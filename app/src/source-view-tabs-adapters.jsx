// React is shared with the host renderer. The official vendor's CommonJS
// factory is a module boundary, never a second bundled copy of React.
import React from 'react';
export const requireHostReact = () => React;
