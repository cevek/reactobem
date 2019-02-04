import React = require('react');
import './Foo';
import './src';
import { assert } from './utils';

export const x = 1;
declare var foo: { bar?: { baz?: { x: 1 }; call?(): { fn?(): { x: 1 } } } };
declare var bar: { baz?: { x: 1 } };
declare var a: { foo?(): { bar: 1 }; baz?: { x: 1 }[] };

function Bar(props: { className?: string }) {
    return <span>123</span>;
}

const ns = {
    Bar,
};

const props = {};
const xx = '';
const f = 1;
const b = 1;

assert((() => <root as="span" />).toString(), '() => React.createElement("span", { className: "test__root" })');
assert((() => <title>Foo</title>).toString(), '() => React.createElement("div", { className: "test__title" }, "Foo")');
assert((() => <Bar />).toString(), '() => React.createElement(Bar, { className: "test__Bar" })');
assert(
    (() => (
        <root mod-foo={f} title="abc" mod-bar={b}>
            123
        </root>
    )).toString(),
    '() => (React.createElement("div", { className: "test__root" + (f ? " test__root--foo" : "") + (b ? " test__root--bar" : ""), title: "abc" }, "123"))'
);
assert(
    (() => <some mod-foo {...props} title="abc" className={xx} mod-bar={false} id="123" />).toString(),
    '() => React.createElement("div", Object.assign({}, props, { title: "abc", className: "test__some" + " test__some--foo" + (" " + xx) + (false ? " test__some--bar" : ""), id: "123" }))'
);
assert(
    (() => <ns.Bar className={xx} />).toString(),
    '() => React.createElement(ns.Bar, { className: "test__Bar" + (" " + xx) })'
);
assert((() => <h1 />).toString(), '() => React.createElement("h1", null)');
assert((() => <img />).toString(), '() => React.createElement("img", null)');
assert((() => <a>foo</a>).toString(), '() => React.createElement("a", null, "foo")');
assert((() => <span />).toString(), '() => React.createElement("span", null)');
assert((() => <img className="foo" />).toString(), '() => React.createElement("img", { className: "foo" })');
assert((() => <img mod-foo="bar" />).toString(), '() => React.createElement("img", null)');

assert((() => <div className="foo-bar" />).toString(), '() => React.createElement("div", { className: "foo-bar" })');
assert(
    (() => (
        <foo>
            <bar>
                <baz />
            </bar>
        </foo>
    )).toString(),
    `() => (React.createElement("div", { className: "test__foo" },
    React.createElement("div", { className: "test__bar" },
        React.createElement("div", { className: "test__baz" }))))`
);
assert(
    (() =>
        function() {
            return <root>bar</root>;
        }).toString(),
    `() => 
        function () {
            return React.createElement("div", { className: "test__root" }, "bar");
        }`
);
assert(
    (() => {
        function Foo() {
            return <root>bar</root>;
        }
    }).toString(),
    `() => {
        function Foo() {
            return React.createElement("div", { className: "test__Foo__root" }, "bar");
        }
    }`
);
assert(
    (() =>
        function Foo() {
            return <root>bar</root>;
        }).toString(),
    `() => function Foo() {
        return React.createElement("div", { className: "test__Foo__root" }, "bar");
    }`
);
assert(
    (() =>
        function Foo() {
            return (
                <div>
                    <span className="hey">bar</span>
                </div>
            );
        }).toString(),
    `() => function Foo() {
        return (React.createElement("div", null, React.createElement("span", { className: "hey" }, "bar")));
    }`
);
assert(
    (() =>
        class Bar {
            render() {
                return <root>bar</root>;
            }
        }).toString(),
    `() => class Bar {
        render() {
            return React.createElement("div", { className: "test__Bar__root" }, "bar");
        }
    }`
);

assert(
    (() => {
        class Bar {
            render() {
                return <root>bar</root>;
            }
        }
    }).toString(),
    `() => {
        class Bar {
            render() {
                return React.createElement("div", { className: "test__Bar__root" }, "bar");
            }
        }
    }`
);

assert(
    (() => {
        const Foo = () => <root>bar</root>;
    }).toString(),
    `() => {
        const Foo = () => React.createElement("div", { className: "test__Foo__root" }, "bar");
    }`
);

console.log('All test passed');
