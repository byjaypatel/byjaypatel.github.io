/* Top-10 matcher data. The risk side comes from TOP10.risks; the evidence side is pulled from
   FINDINGS at runtime (or, for M10, from the m1/crypto step's recorded output) - so a pair can
   never claim something the recorded artifacts do not say. */
window.MATCH = {
  intro: "The Top-10 page above reads like a poster. This board turns it into a claim you have to defend: " +
    "every risk category on the left, ten real lines from the two lab apps on the right. Click a risk, " +
    "then click the line that proves it. Nothing is asserted for you - the pairs are checked against the " +
    "recorded evidence when you click.",
  note: "One line per risk. Where two findings could both answer a category, the board picks the one the " +
    "page's own cross-reference names.",
  pairs: [
    { risk: "M1",  src: "bugbazaar/creds-plaintext" },
    { risk: "M2",  src: "bugbazaar/merger" },
    { risk: "M3",  src: "bugbazaar/userprofile" },
    { risk: "M4",  src: "bugbazaar/provider-sqli" },
    { risk: "M5",  src: "hpandro/h-cleartext" },
    { risk: "M6",  src: "bugbazaar/perms" },
    { risk: "M7",  src: "bugbazaar/debuggable" },
    { risk: "M8",  src: "bugbazaar/permtypo" },
    { risk: "M9",  src: "hpandro/h-allowbackup" },
    { risk: "M10", src: "module:m1/crypto" }
  ]
};