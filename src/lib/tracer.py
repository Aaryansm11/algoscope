"""Runs a LeetCode-style Python solution under sys.settrace and records a
step-by-step trace (serialized locals at every executed line). Returns JSON
that the React app replays as a visualization."""

import sys
import json
import inspect
import builtins
from collections import deque

USER_FILENAME = "<solution>"
MAX_STEPS = 4000
MAX_LEN = 300       # max items serialized per collection
MAX_DEPTH = 8       # max recursion depth when serializing nested structures
MAX_STR = 240

# attributes that mark an object as a "node" (linked list / tree / graph)
NODE_ATTRS = (
    "val", "value", "key", "data",
    "next", "prev", "left", "right",
    "child", "children", "neighbors", "neighbours", "adj",
)


def _clip_str(s):
    return s if len(s) <= MAX_STR else s[:MAX_STR] + "…"


def serialize(obj, memo, depth=0):
    if obj is None or obj is True or obj is False:
        return {"kind": "scalar", "value": obj}
    if isinstance(obj, int):
        return {"kind": "scalar", "value": obj}
    if isinstance(obj, float):
        # JSON can't hold inf/nan
        if obj != obj or obj in (float("inf"), float("-inf")):
            return {"kind": "scalar", "value": repr(obj)}
        return {"kind": "scalar", "value": obj}
    if isinstance(obj, str):
        return {"kind": "scalar", "value": _clip_str(obj), "str": True}

    if depth > MAX_DEPTH:
        return {"kind": "scalar", "value": "…"}

    oid = id(obj)

    if isinstance(obj, (list, tuple)):
        data = []
        for i, x in enumerate(obj):
            if i >= MAX_LEN:
                data.append({"kind": "scalar", "value": "…"})
                break
            data.append(serialize(x, memo, depth + 1))
        return {"kind": "array", "id": oid, "data": data, "tuple": isinstance(obj, tuple)}

    if isinstance(obj, deque):
        data = [serialize(x, memo, depth + 1) for x in list(obj)[:MAX_LEN]]
        return {"kind": "deque", "id": oid, "data": data}

    if isinstance(obj, dict):
        data = []
        for i, (k, v) in enumerate(obj.items()):
            if i >= MAX_LEN:
                break
            data.append({"k": serialize(k, memo, depth + 1),
                         "v": serialize(v, memo, depth + 1)})
        return {"kind": "dict", "id": oid, "data": data}

    if isinstance(obj, (set, frozenset)):
        data = []
        for i, x in enumerate(obj):
            if i >= MAX_LEN:
                break
            data.append(serialize(x, memo, depth + 1))
        return {"kind": "set", "id": oid, "data": data, "frozen": isinstance(obj, frozenset)}

    # node-like object (linked list / tree / graph node)?
    d = getattr(obj, "__dict__", None)
    slots = getattr(type(obj), "__slots__", None)
    keys = []
    if d is not None:
        keys = list(d.keys())
    elif slots is not None:
        keys = [s for s in slots if hasattr(obj, s)]

    if any(a in keys for a in NODE_ATTRS):
        if oid in memo:
            return {"kind": "ref", "id": oid}
        memo.add(oid)
        attrs = {}
        for a in keys:
            if a.startswith("_"):
                continue
            try:
                attrs[a] = serialize(getattr(obj, a), memo, depth + 1)
            except Exception:
                attrs[a] = {"kind": "scalar", "value": "<err>"}
        return {"kind": "node", "id": oid, "cls": type(obj).__name__, "attrs": attrs}

    try:
        return {"kind": "scalar", "value": _clip_str(repr(obj))}
    except Exception:
        return {"kind": "scalar", "value": "<object>"}


class Tracer:
    def __init__(self):
        self.steps = []
        self.truncated = False
        self.depth = 0
        # variable name -> set of methods seen called on it (for DS classification)
        self.ops = {}

    def trace(self, frame, event, arg):
        if frame.f_code.co_filename != USER_FILENAME:
            return None
        if len(self.steps) >= MAX_STEPS:
            self.truncated = True
            sys.settrace(None)
            return None
        if event == "call":
            self.depth += 1
            return self.trace
        if event == "line":
            self._record(frame, "line", None)
            return self.trace
        if event == "return":
            self._record(frame, "return", arg)
            self.depth = max(0, self.depth - 1)
            return self.trace
        return self.trace

    def _record(self, frame, event, arg):
        memo = set()
        out = {}
        for name, val in frame.f_locals.items():
            if name == "self":
                continue
            try:
                out[name] = serialize(val, memo)
            except Exception:
                out[name] = {"kind": "scalar", "value": "<err>"}
        # capture the call stack (user frames only), outermost first
        stack = []
        f = frame
        while f is not None and f.f_code.co_filename == USER_FILENAME:
            stack.append({"func": f.f_code.co_name, "line": f.f_lineno})
            f = f.f_back
        stack.reverse()

        step = {
            "line": frame.f_lineno,
            "func": frame.f_code.co_name,
            "depth": self.depth,
            "event": event,
            "vars": out,
            "stack": stack,
        }
        if event == "return":
            try:
                step["ret"] = serialize(arg, set())
            except Exception:
                pass
        self.steps.append(step)


def _find_callable(g):
    """Locate the entry point: Solution().method, else a top-level function."""
    Solution = g.get("Solution")
    if Solution is not None and isinstance(Solution, type):
        for n, m in vars(Solution).items():
            if not n.startswith("_") and callable(m):
                return Solution(), n
    for n, m in g.items():
        if not n.startswith("_") and inspect.isfunction(m) and m.__module__ == "__main__":
            return None, n
    return None, None


def run_traced(source, input_src):
    g = {"__name__": "__main__", "__builtins__": builtins}
    try:
        exec(compile(source, USER_FILENAME, "exec"), g)
    except Exception as e:
        return json.dumps({"error": "compile/exec error: " + repr(e)})

    instance, name = _find_callable(g)
    if name is None:
        return json.dumps({"error": "No Solution class or top-level function found."})

    target = getattr(instance, name) if instance is not None else g[name]

    # evaluate the input cell (may reference helpers defined in the solution)
    inp = {}
    try:
        exec(compile(input_src or "", "<input>", "exec"), g, inp)
    except Exception as e:
        return json.dumps({"error": "input error: " + repr(e)})

    params = [p for p in inspect.signature(target).parameters]
    if p_missing := [p for p in params if p not in inp]:
        vals = list(inp.values())
        if len(vals) == len(params):
            args = vals
        else:
            return json.dumps({
                "error": "Couldn't map input to parameters " + repr(params)
                + ". Define them by name, e.g. " + (params[0] if params else "x") + " = ..."
            })
    else:
        args = [inp[p] for p in params]

    tracer = Tracer()
    result = None
    err = None
    sys.settrace(tracer.trace)
    try:
        result = target(*args)
    except Exception as e:
        err = repr(e)
    finally:
        sys.settrace(None)

    payload = {
        "steps": tracer.steps,
        "truncated": tracer.truncated,
        "method": name,
        "params": params,
    }
    if err is not None:
        payload["runtimeError"] = err
    else:
        try:
            payload["result"] = serialize(result, set())
        except Exception:
            pass
    return json.dumps(payload)


def run_result(source, input_src):
    """Fast path for test cases: run without tracing, just return the result."""
    g = {"__name__": "__main__", "__builtins__": builtins}
    try:
        exec(compile(source, USER_FILENAME, "exec"), g)
    except Exception as e:
        return json.dumps({"error": repr(e)})
    instance, name = _find_callable(g)
    if name is None:
        return json.dumps({"error": "No Solution class or top-level function found."})
    target = getattr(instance, name) if instance is not None else g[name]
    inp = {}
    try:
        exec(compile(input_src or "", "<input>", "exec"), g, inp)
    except Exception as e:
        return json.dumps({"error": "input error: " + repr(e)})
    params = [p for p in inspect.signature(target).parameters]
    missing = [p for p in params if p not in inp]
    if missing:
        vals = list(inp.values())
        if len(vals) == len(params):
            args = vals
        else:
            return json.dumps({"error": "Couldn't map input to " + repr(params)})
    else:
        args = [inp[p] for p in params]
    try:
        return json.dumps({"result": serialize(target(*args), set())})
    except Exception as e:
        return json.dumps({"runtimeError": repr(e)})
