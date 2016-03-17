import { Component, Children } from "react";
import { isValidElement, createElement, cloneElement } from "react";
import { Props, ReactType, ReactElement, ReactNode, ReactChild,
    ComponentClass, StatelessComponent } from "react";




// -----------------------------------------------------------------------------
// Functor ReactElement
//
// The pattern distinguishes between the different ReactElement types:
//
//   - String (div, span, ...)
//   - Component (class/stateful component or stateless component)

export interface ReactElementPattern {
    String(el: ReactElement<any>, type: string): ReactElement<any>;
    Component(el: ReactElement<any>, type: ComponentClass<any> | StatelessComponent<any>): ReactElement<any>;
}

export function
mapReactElement<T>(pattern: ReactElementPattern): (el: ReactElement<T>) => ReactElement<T> {
    return el => {
        const type = el.type;

        if (typeof type === "string") {
            return pattern.String(el, type);
        } else if (typeof type === "function") {
            return pattern.Component(el, type);
            // return createElement(<any>wrapType(type, mapReactElement(pattern)), el.props);
        } else {
            throw new Error("mapReactElement: unknown type " + JSON.stringify(type));
        }
    };
}


// Wrap a component class or stateless component in a new type so that we can
// map over the returned ReactElement.

const typeWrappers: WeakMap<any, any> = new WeakMap();

export function
wrapType(type: ComponentClass<any> | StatelessComponent<any>, f: (el: ReactElement<any>) => ReactElement<any>): ReactType {
    let w = typeWrappers.get(type);

    if (w === undefined) {
        w = mkTypeWrapper(type, f);
        typeWrappers.set(type, w);
    }

    return w;
}

function mkTypeWrapper(type: ComponentClass<any> | StatelessComponent<any>, f: (el: ReactElement<any>) => ReactElement<any>): ReactType {
    if (type.prototype && type.prototype instanceof Component) {
        return <any> class extends (<ComponentClass<any>>type.prototype.constructor) {
            render() { return f(super.render()); }
        };
    } else {
        return function(props, context) {
            return f((<StatelessComponent<any>>type)(props, context));
        };
    }
}



// -----------------------------------------------------------------------------
// Functor ReactChild

export interface ReactChildPattern {
    Null(): ReactChild;
    String(x: string): ReactChild;
    Number(x: number): ReactChild;
    Element(x: ReactElement<any>): ReactChild;
}

export function
mapReactChild(pattern: ReactChildPattern): (child: ReactChild) => ReactChild {
    return child => {
        if (child === null) {
            return pattern.Null();
        } else if (typeof child === "string") {
            return pattern.String(child);
        } else if (typeof child === "number") {
            return pattern.Number(child);
        } else if (isValidElement(child)) {
            return pattern.Element(child);
        } else {
            throw new Error("mapReactChild: unknown child " + JSON.stringify(child));
        }
    };
}



// -----------------------------------------------------------------------------
// Functor ReactNode

export interface ReactNodePattern {
    Boolean(x: boolean): ReactNode;
    Fragment(x: Array<ReactNode>): ReactNode;
    Child(x: ReactChild): ReactNode;
}

export function
mapReactNode(pattern: ReactNodePattern): (node: ReactNode) => ReactNode {
    return node => {
        if (typeof node === "boolean") {
            return pattern.Boolean(node);
        } else if (Array.isArray(node)) {
            return pattern.Fragment(node);
        } else {
            return pattern.Child(<any>node);
        }
    };
}
