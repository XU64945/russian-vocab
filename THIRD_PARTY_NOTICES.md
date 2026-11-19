# Third-party interaction sources

These source mechanisms were adapted into the СЛОВО interface. Visual styling,
content and application integration are original to this project.

| Component | Source | License | Adapted file | Used in |
| --- | --- | --- | --- | --- |
| CountUp | https://reactbits.dev/text-animations/count-up | MIT + Commons Clause | `src/components/ui/AnimatedNumber.jsx` | Dashboard and progress metrics |
| BorderBeam | https://github.com/libraries-dev/border-beam | MIT | `src/components/ui/BorderBeam.jsx` | Today's word card |
| Accordion | https://ui.shadcn.com/docs/components/accordion | MIT | `src/components/ui/Disclosure.jsx` | Review method and progress explanations |
| Dropdown menu morph | https://transitions.dev/transitions/dropdown-menu-morph/ | Commercial product use permitted by source page | `src/components/ui/MorphSelect.jsx` | Wordbook switcher |
| Analytics disclosure / slide-over | https://github.com/obsidian-ui/obsidian-ui | MIT | `src/components/Sidebar.jsx`, `src/components/ui/Disclosure.jsx` | Mobile more sheet and expandable details |

Source snapshots used during implementation are retained under
`work/ui-sources/` in the parent workspace and are not part of the application
bundle.
