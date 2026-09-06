# DISTRIBUTED MIRROR - the source of truth lives in resonance-awen

As of 2026-09-02 (THE COLUMN COMES TO LIFE - the collaboration layer
beside the recorder, at KP's ⚛ ruling on takes.provenance), the key's
single editable truth is:
../resonance-awen/tools/the-clavis/src/index.ts

Do not edit index.ts in THIS folder - it is a byte-faithful mirror
(SHA256 verified at the copy: 2E3448EEB220FE20). Claiming-law changes
happen in the water.

WHAT DID NOT CROSS, AND WHY. The water ships two reference hosts under
`src/hosts/` and a hand-written `src/host-surface.d.ts` that declares
`crypto`, `CryptoKey` and `TextEncoder` at global scope, because the
tool carries ZERO dependencies and pulls in no lib. This app already
has lib.DOM; those declarations would collide with it, and the
reference host's `generateKey` line does not typecheck against the
DOM's own overloads. So the HOST is this app's own, at
`src/lib/keyring/hosts.ts` - which is exactly what the water asks for:
`NO_KEY_STORAGE`, "key storage is the HOST'S business." That file is a
line-for-line restatement of the reference host, typed against the
DOM, and it generates the private half NON-EXTRACTABLE the same way.

Record: RUN-LOG.md, .journals/realm/2026-09-02-the-column-comes-to-life.md.
