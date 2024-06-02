// ᕦ(ツ)ᕤ
// shared.fm.ts
// feature-modular experiments
// author: asnaroo

import { _Feature, feature, on, after, before, struct, make, fm}  from "./fm.js";

//-----------------------------------------------------------------------------
// Run

export const load = () => { console.log("loaded shared module"); };

//-----------------------------------------------------------------------------
// Do Something

export declare const run: () => void;

@feature class _Shared extends _Feature {
     @on async run() { console.log("shared run"); }
}

//-----------------------------------------------------------------------------
// Devices : things like servers, laptops, phones, drones, etc.
// a Device is accessible via network; has URL and port.
// you can check if it's accessible, and call functions remotely on it.

@struct export class Device { url: string = ""; port: number = 0; }

export declare const ping: (d: Device) => Promise<boolean>;
export declare const remote: (d: Device, targetFunction: Function) => Function;
export declare const stub: () => boolean;

declare const rpc: (d: Device, functionName: string, params: any) => Promise<any>;


function paramList(func: Function) {
  const funcStr = func.toString();
  const paramStr = funcStr.match(/\(([^)]*)\)/)![1];
  const params = paramStr.split(',').map(param => param.trim()).filter(param => param);
  return params;
}

@feature class _Device extends _Feature {
    @on stub() : boolean { return true; }
    @on async ping(d: Device) : Promise<boolean> {
        try {
            return remote(d, stub)();
        } catch(e) {
            return false; 
        }
    }
    @on remote(d: Device, targetFunction: Function) {
        let functionName = targetFunction.name;
        if (functionName.startsWith("bound ")) { functionName = functionName.slice(6); }
        const paramNames = fm.getFunctionParams(functionName);
        return new Proxy(targetFunction, {
            apply: async function(target, thisArg, argumentsList) {
                const params : any = {};
                paramNames.forEach((paramName, index) => {
                    params[paramName] = argumentsList[index];
                });
                return rpc(d, functionName, params);
            }
        });
    };
    @on async rpc(d: Device, functionName: string, params: any) {
        const response = await fetch(`${d.url}:${d.port}/${functionName}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const responseData = await response.json();
        return responseData;
    }
}

//------------------------------------------------------------------------------
// Greet adds a "greet" function that returns a greeting

declare const greet: (name: string) => string;

@feature class _Greet extends _Shared{
    @on greet(name: string): string {
        let result = `hello, ${name}!`;
        console.log(result);
        return result;
    }
    @after async run() {
        const server = make(Device, { url: "http://localhost", port: 8000 });
        greet("asnaroo");
        const msg = await remote(server, greet)("asnaroo");
        console.log("server:", msg);
    }
}