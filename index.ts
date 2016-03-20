import { Component, isValidElement } from "react";
import { ReactElement, ReactNode, ReactChild,
    ComponentClass, StatelessComponent } from "react";


// TODO: Try to push this type alias upstream, to DefinitelyTyped.
export type ReactComponentType<T> = ComponentClass<T> | StatelessComponent<T>;



// -----------------------------------------------------------------------------
// Functor ReactElement
//
// The pattern distinguishes between the different ReactElement types:
//
//   - String (div, span, ...)
//   - Component (class/stateful component or stateless component)

export interface ReactElementPattern<T> {
    String(el: ReactElement<any>, type: string, children: ReactNode): T;
    Component(el: ReactElement<any>, type: ReactComponentType<any>): T;
}

export function
mapReactElement<T>(pattern: ReactElementPattern<T>): (el: ReactElement<any>) => T {
    return el => {
        const type = el.type;

        if (typeof type === "string") {
            return pattern.String(el, type, (<any>el.props).children);
        } else if (typeof type === "function") {
            return pattern.Component(el, type);
        } else {
            throw new Error("mapReactElement: unknown type " + JSON.stringify(type));
        }
    };
}



// -----------------------------------------------------------------------------
// Functor ReactChild

export interface ReactChildPattern<T> {
    Null(): T;
    String(x: string): T;
    Number(x: number): T;
    Element(x: ReactElement<any>): T;
}

export function
mapReactChild<T>(pattern: ReactChildPattern<T>): (child: ReactChild) => T {
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

export interface ReactNodePattern<T> {
    Boolean(x: boolean): T;
    Fragment(x: Array<ReactNode>): T;
    Child(x: ReactChild): T;
}

export function
mapReactNode<T>(pattern: ReactNodePattern<T>): (node: ReactNode) => T {
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



// -----------------------------------------------------------------------------
// ReactType (ComponentClass/StatelessComponent) wrappers
//
// Wrap a component class or stateless component in a new type so that we can
// map over the returned ReactElement.
//
// Because ReactTypes must be comparable with the standard JavaScript equality
// check, we need to cache the wrappers. This is done using a 'WeakMap' so that
// unused types are automatically disposed.


// Think of this as a cache where the key is the tuple [ReactComponentType,f].
// But due to JavaScript restrictions, we can't use that and implement it
// instead as a two-level cache.

const componentTypeWrappers: WeakMap<any,WeakMap<any,any>> = new WeakMap();


export function
wrapComponentType(type: ReactComponentType<any>, f: (el: ReactElement<any>) => ReactElement<any>): ReactComponentType<any> {
    let typeCache = componentTypeWrappers.get(type);

    if (typeCache === undefined) {
        typeCache = new WeakMap();
        componentTypeWrappers.set(type, typeCache);
    }

    let wrapperType = typeCache.get(f);
    if (wrapperType === undefined) {
        wrapperType = mkComponentTypeWrapper(type, f);
        typeCache.set(f, wrapperType);
    }

    return wrapperType;
}


function mkComponentTypeWrapper(type: ReactComponentType<any>, f: (el: ReactElement<any>) => ReactElement<any>): ReactComponentType<any> {
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
