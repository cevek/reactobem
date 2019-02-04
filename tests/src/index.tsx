import React = require('react');
import { assert } from '../utils';

assert((() => <root/>).toString(), '() => React.createElement("div", { className: "root" })');
