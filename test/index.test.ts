/* global describe, it, beforeEach */

import {assert} from "chai";

import {Children, createElement} from "react";
import {renderToString} from "react-dom/server";

import {ReactElementPattern, mapReactElement, wrapType} from "../index";
import {ReactChildPattern, mapReactChild} from "../index";
import {ReactNodePattern, mapReactNode} from "../index";


function traceReactElementPattern(depth: number): ReactElementPattern {
    return {
        String(el, type) {
            console.log(depth, "E/S", type);
            if (el.props.children) {
                Children.forEach(el.props.children, node => {
                    mapReactNode(traceReactNodePattern(depth + 1))(node);
                });
            }
            return el;
        },
        Component(el, type) {
            console.log(depth, "E/C", type);
            return createElement(<any>wrapType(type, mapReactElement(traceReactElementPattern(depth + 1))), el.props);
        },
    };
}
function traceReactChildPattern(depth: number): ReactChildPattern {
    return {
        Null() {
            console.log("NULL");
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

function traceReactNodePattern(depth: number): ReactNodePattern {
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

function Test() {
    return createElement("svg");
}

describe("mapReactNode", () => {
  it("mapReactNode", () => {
      let root = mapReactElement(traceReactElementPattern(0))(
          createElement("div", {},
           createElement("div")
          , false
          , [ true
            , createElement("span", {key: 1}, "text")
            , createElement(Test, {key: 2})
            , "test"
            ]
        )
      );

      console.log(renderToString(root));
  });
});
