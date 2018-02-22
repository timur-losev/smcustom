/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

dictionary TestInterfaceJSUnionableDictionary {
  object objectMember;
  any anyMember;
};

[JSImplementation="@mozilla.org/dom/test-interface-js;1",
 Pref="dom.expose_test_interfaces",
 Constructor(optional any anyArg, optional object objectArg, optional TestInterfaceJSDictionary dictionaryArg)]
interface TestInterfaceJS {
  readonly attribute any anyArg;
  readonly attribute object objectArg;
  [Cached, Pure] readonly attribute TestInterfaceJSDictionary dictionaryArg;
  attribute any anyAttr;
  attribute object objectAttr;
  [Cached, Pure] attribute TestInterfaceJSDictionary dictionaryAttr;
  any pingPongAny(any arg);
  object pingPongObject(object obj);
  any pingPongObjectOrString((object or DOMString) objOrString);
  TestInterfaceJSDictionary pingPongDictionary(optional TestInterfaceJSDictionary dict);
  long pingPongDictionaryOrLong(optional (TestInterfaceJSUnionableDictionary or long) dictOrLong);
  DOMString pingPongMap(MozMap<any> map);
  long objectSequenceLength(sequence<object> seq);
  long anySequenceLength(sequence<any> seq);

  // For testing bug 968335.
  DOMString getCallerPrincipal();
};
