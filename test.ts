/* global describe, it, beforeEach */

import {assert} from "chai";

import {Component, createFactory, createElement, cloneElement} from "react";
import {ReactElement, ReactNode, ReactChild} from "react";
import {renderToString} from "react-dom/server";

import {ReactElementPattern, mapReactElement, wrapComponentType} from "./index";
import {ReactChildPattern, mapReactChild} from "./index";
import {ReactNodePattern, mapReactNode} from "./index";



// -----------------------------------------------------------------------------
// Patterns: id
//
// These patterns don't perform any transformation, they are essentially 'id'.
// We use them in the tests to ensure that our patterns cover all the possible
// shapes of the React Virtual DOM tree.

const idReactElementPattern: ReactElementPattern<ReactElement<any>> = {
    String(el, type, children) {
        return children === undefined ? el :
            cloneElement(el, el.props, idReactNode(children));
    },
    Component(el, type) {
        return createElement(wrapComponentType(type, idReactElement), el.props);
    },
};
const idReactElement = mapReactElement(idReactElementPattern);

const idReactNodePattern: ReactNodePattern<ReactNode> = {
    Boolean(x)   { return x; },
    Fragment(xs) { return xs.map(idReactNode); },
    Child(x)     { return idReactChild(x); },
};
const idReactNode = mapReactNode(idReactNodePattern);

const idReactChildPattern: ReactChildPattern<ReactChild> = {
    Null()     { return null; },
    String(x)  { return x; },
    Number(x)  { return x; },
    Element(x) { return idReactElement(x); },
};
const idReactChild = mapReactChild(idReactChildPattern);



// -----------------------------------------------------------------------------
// Patterns: trace
//
// These are used for debugging, they print out the type of elements/nodes
// which are visited.

function traceReactElementPattern(depth: number): ReactElementPattern<ReactElement<any>> {
    return {
        String(el, type, children) {
            console.log(depth, "E/S", type, mapReactNode(typeofReactNodePattern)(children));
            if (children) {
                const newChildren = mapReactNode(traceReactNodePattern(depth + 1))(children);
                return cloneElement(el, el.props, newChildren);
            } else {
                return el;
            }
        },
        Component(el, type) {
            console.log(depth, "E/C", type);
            return createElement(wrapComponentType(type, mapReactElement(traceReactElementPattern(depth + 1))), el.props);
        },
    };
}

function traceReactChildPattern(depth: number): ReactChildPattern<ReactChild> {
    return {
        Null() {
            console.log(depth, "NULL");
            return null;
        },
        String(x) {
            console.log(depth, "S", x);
            return x;
        },
        Number(x) {
            console.log(depth, "N", x);
            return x;
        },
        Element(x) {
            console.log(depth, "CE");
            return mapReactElement(traceReactElementPattern(depth))(x);
        },
    };
}

function traceReactNodePattern(depth: number): ReactNodePattern<ReactNode> {
    return {
        Boolean(x) {
            console.log(depth, "B", x);
            return x;
        },
        Fragment(xs) {
            console.log(depth, "F");
            return xs.map(mapReactNode(traceReactNodePattern(depth + 1)));
        },
        Child(x) {
            return mapReactChild(traceReactChildPattern(depth))(x);
        },
    };
}


// -----------------------------------------------------------------------------
// Patterns: typeof
//
// Map the items into a string which describes their type.

const typeofReactNodePattern: ReactNodePattern<string> = {
    Boolean()  { return 'boolean'; },
    Fragment() { return 'fragment'; },
    Child()    { return 'child'; },
};



// -----------------------------------------------------------------------------
// Stateless Components

function SomeStatelessComponent() {
    return createElement('div');
}

function AnotherStatelessComponent() {
    return createElement(SomeStatelessComponent);
}
const anotherStatelessComponent = createFactory(AnotherStatelessComponent);

function ThirdStatelessComponent() {
    return createElement(SomeComponentClass);
}
const thirdStatelessComponent = createFactory(ThirdStatelessComponent);



// -----------------------------------------------------------------------------
// Component Classes

class SomeComponentClass extends Component<any,any> {
    render() {
        return createElement('div');
    }
}

class AnotherComponentClass extends Component<any,any> {
    render() {
        return createElement(SomeComponentClass);
    }
}

class ThirdComponentClass extends Component<any,any> {
    render() {
        return createElement(SomeStatelessComponent);
    }
}
const thirdComponentClass = createFactory(ThirdComponentClass);



// -----------------------------------------------------------------------------
// ReactElement constructors and test fitures

const div = createFactory("div");
const span = createFactory("span");

// This is a complex ReactElement tree which is used throughout the tests. It
// should cover all the possible ways how the different element types are
// nested in each other.
const rootElement =
div({}
, false // Boolean
, null // Child: Null
, "string" // Child: String
, div() // Child: Element: String
, [ // Fargment
    true // Boolean
  , span({key: 1} // Child: Element: String
    , "text" // Child: String
    )
  , anotherStatelessComponent({key: 2}) // Child: Element: Component (stateless)
  , thirdComponentClass({key: 3}) // Child: Element: Component (stateful)
  , [ // Fragment
      thirdStatelessComponent() // Child: Element: Component (stateless)
    , div() // Child: Element: String
    ]
  ]
);



// -----------------------------------------------------------------------------

describe("Integration tests", () => {
    it("Identity functor should not throw an exception", () => {
        // Force the whole tree to be evaluated. If we don't do this then the
        // tree will be evaluated only up to the components.
        renderToString(idReactElement(rootElement));
    });
});

describe("Expectations how children of a ReactElement are structured", () => {
    function run(expected: ReactNode, ...children: ReactNode[]): void {
        const el = idReactElement(div({}, ...children));
        assert.deepEqual(el.props.children, expected);
    }

    it("Boolean", () => {
        run(true, true);
    });
    describe("Fragment", () => {
        it("A single array is converted into a fragment", () => {
            run(["foo","bar"], ["foo","bar"]);
        });
        it("Multiple nodes are converted into a fragment", () => {
            run(["foo","bar"], "foo", "bar");
            run(["foo",true,"bar"], "foo", true, "bar");
        });
        it("Multiple fragments remain fragments", () => {
            run([["foo"],["bar"]], ["foo"], ["bar"]);
        });
    });
    describe("Child", () => {
        it("Null", () => {
            run(null, null);
        });
        it("String", () => {
            run("child", "child");
        });
        it("Number", () => {
            run(42, 42);
        });
        it("Element", () => {
            run(div(), div());
        });
    });

    it("Mixed ReactNode children", () => {
        run(div({}), div({}));
        run(div({},"test"), div({},"test"));
        run([true,"test",div()], true, "test", div());
        run(["foo",true,"bar",42], "foo", true, "bar", 42);
        run([true,"test",div(),42], true, "test", div(), 42);
        run([div({key:1},"test"),42], div({key:1},"test"), 42);
    });
});
