# Inside a superconducting quantum computer

An interactive, procedurally built three.js model of a superconducting quantum computer
that you can take apart, from the equipment room down to a single Josephson junction.

## Five zoom levels

| View | Scale | What is modelled |
|---|---|---|
| Whole system | about 3 m | Support frame, control rack (clock, DAC/AWG, LO + IQ mixers, digitizer/FPGA, DC sources, amplifiers), gas handling system (turbo pump, backing pump, cold trap, mixture tanks), pulse tube compressor, helium lines, room-temperature cabling |
| Cryostat | about 1.5 m | Six plates (300 K, 50 K, 4 K, still, cold, mixing chamber), outer vacuum can and three radiation shields, G10 supports, pulse tube with rotary valve and copper braids, heat switches, still pumping line, still, condensing line and flow impedance, continuous and step heat exchangers, mixing chamber, thermometers, 10 coax lines with bulkheads, attenuators, IR (Eccosorb) and low-pass filters, NbTi output lines, flex cables, DC loom, HEMTs at 4 K, readout chains (isolators, directional coupler, TWPA), cold finger, magnetic and superconducting shields, sample package, TWPA pump line |
| Sample package | about 3 cm | Copper base, microwave PCB with traces and via fences, 12 connectors, chip, about 150 wirebonds, IR absorber, lid, NbTi bias coil |
| Quantum chip | about 10 mm | Substrate, ground plane, 5 Xmon transmons with SQUIDs, 4 tunable couplers, meandered readout resonators, Purcell filter, feedline, 14 routed XY/Z control lines, bond pads, airbridges, flip-chip indium bumps, wiring chip with through-silicon vias |
| Josephson junction | about 1 µm | Island and ground films, Al bottom electrodes, AlOx tunnel barriers, Al top electrodes, SQUID loop with flux, flux-line end |

## Controls

- Drag to rotate, right-drag or shift-drag to pan, scroll or pinch to zoom.
- Click any part, label or list item to read what it does; "Show only this" isolates it.
- Take apart: separates stages and layers in each view.
- Vacuum cans, labels, temperature map (log colour scale, 300 K to 10 mK), follow a signal
  (control pulses going down, readout coming up), guided tour (15 stops, arrow keys work).
- Press `/` to search parts, `Esc` to clear the selection. Links like `index.html#twpa` open a part directly.

## Rendering

Metal colours approximate the measured reflectance of the real materials (gold plating,
oxygen-free copper, aluminium, stainless steel, silver, niobium-titanium). Surfaces get
procedural textures generated in the browser: lathe-turned rings on the gold plates,
brushed grain on steel and aluminium, corrugated bellows on helium hoses, braided copper
straps, woven laminate on the circuit board and a speckled lab floor. Lighting is a studio
environment (overhead softbox, warm and cool strip lights, dark floor) with soft shadows
framed for each view.

## Hidden view captions

Each view has a one-sentence caption (stored in `VIEWS` in `js/app.js`). They can be shown
over the 3D model but are turned off because there is not enough space without covering
the visuals. To turn them back on, set `QC.SHOW_CAPTIONS = true` in `js/app.js`.

## Accuracy notes

The layout follows published descriptions of commercial dilution refrigerators and
superconducting processors (Bluefors, Oxford Instruments, IBM, Google, Rigetti, Krinner and
others), but it is a teaching model, not an engineering drawing of any one machine.
Proportions are simplified, line counts are reduced, and film thickness, the flip-chip gap
and junction layers are exaggerated so they can be seen. Temperatures, attenuation and gain
values are typical figures, not specifications.

## Files

- `index.html` — page and script loader
- `css/style.css` — interface styles
- `js/data.js` — every part's name, location, temperature and explanation (edit this to change the teaching text)
- `js/util.js` — materials and building helpers
- `js/controls.js` — camera controls
- `js/build-cryostat.js`, `js/build-facility.js`, `js/build-detail.js` — the 3D model
- `js/app.js` — interaction, labels, tour, temperature map, signal animation

## License

MIT, see [LICENSE](LICENSE). Attributions for the GitHub mark (Octicons, MIT), three.js (MIT) and
the IBM Plex fonts (SIL OFL 1.1) are in [NOTICE.md](NOTICE.md). Source: https://github.com/saadbhattii/iascqc
