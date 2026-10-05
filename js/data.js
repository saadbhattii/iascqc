/* Component catalogue for the superconducting quantum computer model.
   Every 3D mesh is tagged with one of these ids. */
(function () {
  const QC = (window.QC = window.QC || {});

  QC.VIEW_NAMES = {
    system: 'Whole system',
    cryostat: 'Cryostat',
    package: 'Sample package',
    chip: 'Quantum chip',
    qubit: 'Josephson junction',
  };

  // tempK is used by the temperature map (log colour scale).
  QC.PARTS = {
    /* ---------------- Whole system: room-temperature equipment ---------------- */
    rack: {
      name: 'Control electronics rack', view: 'system', cat: 'Control electronics',
      where: 'Beside the fridge', temp: 'Room temperature', tempK: 300,
      text: [
        'Every operation on the qubits starts and ends here. The rack creates microwave pulses timed to the nanosecond, sends them down into the fridge, and digitises the faint signals that come back.',
        'The rack grows with the processor. Google\u2019s 53-qubit Sycamore needed four chassis, each serving about 15 qubits along with their couplers and readout.',
      ],
      links: ['awg', 'lo', 'adc', 'rtwiring'],
    },
    awg: {
      name: 'Waveform generators (DACs)', view: 'system', cat: 'Control electronics',
      where: 'Control rack', temp: 'Room temperature', tempK: 300,
      text: [
        'Digital-to-analog converters turn waveforms calculated in software into real voltages. Pulse shapes are designed so a qubit rotates by exactly the intended angle without leaking into higher energy levels.',
        'Fast flux pulses for two-qubit gates come straight out of DAC channels; single-qubit pulses are shifted up to gigahertz frequencies first.',
      ],
      links: ['lo', 'xyline', 'zline'],
    },
    lo: {
      name: 'Local oscillators and IQ mixers', view: 'system', cat: 'Control electronics',
      where: 'Control rack', temp: 'Room temperature', tempK: 300,
      text: [
        'Qubits respond at roughly 4\u20138 GHz. An IQ mixer combines a steady gigahertz tone from a local oscillator with two slower waveforms (I and Q) to place each pulse at the qubit frequency with a chosen phase.',
        'Mixer imperfections such as leakage of the oscillator tone must be calibrated away, or they drive the qubit continuously. Newer controllers built on RFSoC chips generate microwaves directly and skip the analog mixer.',
      ],
      links: ['awg', 'adc'],
    },
    adc: {
      name: 'Digitizers and FPGA controller', view: 'system', cat: 'Control electronics',
      where: 'Control rack', temp: 'Room temperature', tempK: 300,
      text: [
        'Readout signals are mixed back down and sampled by analog-to-digital converters. An FPGA separates each qubit\u2019s frequency channel and decides 0 or 1 in real time.',
        'Because this takes nanoseconds, the FPGA can trigger feedback, an operation that depends on a measurement result, which error correction relies on.',
      ],
      links: ['feedline', 'rtamp'],
    },
    clock: {
      name: 'Reference clock', view: 'system', cat: 'Control electronics',
      where: 'Control rack', temp: 'Room temperature', tempK: 300,
      text: [
        'All instruments share one frequency reference, often 10 MHz from a rubidium standard. Without it, pulses from different boxes would slowly drift in phase and multi-qubit gates would fail.',
      ],
    },
    dcsrc: {
      name: 'DC bias current sources', view: 'system', cat: 'Control electronics',
      where: 'Control rack', temp: 'Room temperature', tempK: 300,
      text: [
        'Ultra-low-noise current sources set the resting frequency of tunable qubits and couplers through flux lines or a global coil. Any noise here becomes frequency jitter on the qubit, so these lines are filtered heavily on the way down.',
      ],
      links: ['dcloom', 'coil', 'zline'],
    },
    rtamp: {
      name: 'Room-temperature amplifiers', view: 'system', cat: 'Control electronics',
      where: 'Control rack', temp: 'Room temperature', tempK: 300,
      text: [
        'After the cryogenic amplifiers, the readout signal gets its last boost here before digitisation. The complete output chain adds around 100 dB of gain. DC blocks on the lines break ground loops between instruments and the fridge.',
      ],
      links: ['hemt', 'twpa'],
    },
    rtwiring: {
      name: 'Room-temperature cabling', view: 'system', cat: 'Control electronics',
      where: 'Rack to fridge top', temp: 'Room temperature', tempK: 300,
      text: [
        'Coax cables run from the rack to hermetic feedthroughs on the top plate. Each qubit needs several lines (drive, flux, readout), which is why wiring becomes the bottleneck as processors grow.',
      ],
      links: ['coax', 'flex'],
    },
    ghs: {
      name: 'Gas handling system', view: 'system', cat: 'Cryogenic support',
      where: 'Cabinet beside the fridge', temp: 'Room temperature', tempK: 300,
      text: [
        'The lungs of the fridge. This cabinet stores the helium-3/helium-4 mixture, pumps helium-3 vapour out of the still, cleans it, and pushes it back down the condensing line in a continuous loop.',
        'Valves, pressure gauges and safety relief paths are run automatically; if power fails, the mixture is dumped safely into the storage tanks.',
      ],
      links: ['turbo', 'scroll', 'coldtrap', 'tanks', 'still'],
    },
    turbo: {
      name: 'Turbomolecular pump', view: 'system', cat: 'Cryogenic support',
      where: 'Gas handling system', temp: 'Room temperature', tempK: 300,
      text: [
        'Pumps helium-3 vapour off the still at very low pressure. That steady evaporation keeps helium-3 crossing the phase boundary in the mixing chamber, the process that produces the cooling.',
      ],
      links: ['still', 'mxc'],
    },
    scroll: {
      name: 'Backing pump and compressor', view: 'system', cat: 'Cryogenic support',
      where: 'Gas handling system', temp: 'Room temperature', tempK: 300,
      text: [
        'A turbo pump cannot exhaust to atmosphere, so an oil-free scroll or multi-stage Roots pump backs it and raises the gas pressure enough for it to re-condense inside the fridge. Newer designs replace several pumps with one multi-stage Roots unit.',
      ],
    },
    coldtrap: {
      name: 'Cold trap', view: 'system', cat: 'Cryogenic support',
      where: 'Gas handling system', temp: 'Room temperature housing', tempK: 300,
      text: [
        'Traces of air or water in the mixture would freeze and plug the fine capillaries of the dilution unit. The cold trap freezes out these contaminants before the gas returns to the fridge.',
      ],
    },
    tanks: {
      name: 'Mixture storage tanks', view: 'system', cat: 'Cryogenic support',
      where: 'Behind the gas handling system', temp: 'Room temperature', tempK: 300,
      text: [
        'When the fridge is warm, the mixture waits here as gas. A typical system uses roughly 12\u201318 litres (at standard conditions) of helium-3, a scarce and expensive isotope.',
      ],
    },
    compressor: {
      name: 'Pulse tube compressor', view: 'system', cat: 'Cryogenic support',
      where: 'Floor or machine room', temp: 'Room temperature', tempK: 300,
      text: [
        'A helium compressor that drives the pulse tube cooler with high- and low-pressure gas. It provides all the cooling from room temperature down to about 4 K, so a modern \u201cdry\u201d fridge needs no liquid helium or nitrogen.',
      ],
      links: ['helines', 'rotvalve', 'pulsetube'],
    },
    helines: {
      name: 'Helium flex lines', view: 'system', cat: 'Cryogenic support',
      where: 'Compressor to fridge', temp: 'Room temperature', tempK: 300,
      text: [
        'Flexible stainless-steel hoses carry helium between the compressor and the pulse tube\u2019s rotary valve. A separate wide line connects the still pumping line to the gas handling system.',
      ],
    },
    frame: {
      name: 'Support frame', view: 'system', cat: 'Structure',
      where: 'Around the cryostat', temp: 'Room temperature', tempK: 300,
      text: [
        'The whole cryostat hangs from its top plate on this frame, often with vibration dampers. The vacuum cans are removed downward, so the space underneath stays clear.',
      ],
    },
    rotvalve: {
      name: 'Pulse tube motor and rotary valve', view: 'cryostat', cat: 'Cooling',
      where: 'Top of the cryostat', temp: 'Room temperature', tempK: 300,
      text: [
        'A motor-driven rotary valve switches the pulse tube between the high- and low-pressure helium lines about once a second. These pressure oscillations are what pump heat out of the cold head. Mounting it on a separate bracket keeps vibration away from the qubits.',
      ],
      links: ['pulsetube', 'compressor'],
    },

    /* ---------------- Cryostat ---------------- */
    plate300: {
      name: 'Top plate', view: 'cryostat', cat: 'Structure and shields',
      where: 'Top of the cryostat', temp: '300 K (room temperature)', tempK: 300,
      text: [
        'Everything inside hangs from this thick flange. It seals the outer vacuum can and holds every port: coax feedthroughs, DC connectors, the pulse tube, and the dilution unit\u2019s pumping lines.',
      ],
      links: ['ovc', 'bulkheads'],
    },
    ovc: {
      name: 'Outer vacuum can', view: 'cryostat', cat: 'Structure and shields',
      where: 'Outermost can', temp: '300 K', tempK: 300,
      text: [
        'An aluminium or steel can sealed to the top plate and pumped to high vacuum. Removing the gas stops it carrying heat from the room to the cold stages.',
      ],
    },
    plate50: {
      name: '50 K plate', view: 'cryostat', cat: 'Structure and shields',
      where: 'Pulse tube first stage', temp: 'About 40\u201350 K', tempK: 50,
      text: [
        'Cooled by the pulse tube\u2019s first stage. It intercepts most of the heat radiated and conducted from room temperature, so the colder stages below receive far less.',
      ],
      links: ['shield50', 'pulsetube'],
    },
    shield50: {
      name: '50 K radiation shield', view: 'cryostat', cat: 'Structure and shields',
      where: 'Hangs from the 50 K plate', temp: 'About 50 K', tempK: 50,
      text: [
        'At low temperature most heat arrives as infrared radiation. Each nested can is held at its plate\u2019s temperature, so the stages inside see a cold wall instead of a 300 K one.',
      ],
    },
    plate4: {
      name: '4 K plate', view: 'cryostat', cat: 'Structure and shields',
      where: 'Pulse tube second stage', temp: 'About 3\u20134 K', tempK: 4,
      text: [
        'Cooled by the pulse tube\u2019s second stage. This is the coldest stage with substantial cooling power (around a watt), so the HEMT amplifiers live here along with the first heavy attenuators.',
      ],
      links: ['hemt', 'att', 'shield4'],
    },
    shield4: {
      name: '4 K radiation shield', view: 'cryostat', cat: 'Structure and shields',
      where: 'Hangs from the 4 K plate', temp: 'About 4 K', tempK: 4,
      text: [
        'The second nested shield. At 4 K its own thermal radiation is already tiny compared to the 50 K shield outside it.',
      ],
    },
    platestill: {
      name: 'Still plate', view: 'cryostat', cat: 'Structure and shields',
      where: 'Dilution unit, top', temp: 'About 800 mK', tempK: 0.8,
      text: [
        'The first stage cooled by the dilution unit itself. The still chamber below it is gently heated so helium-3 evaporates from the mixture and is pumped away. Cables are thermally anchored here too.',
      ],
      links: ['still', 'shieldstill'],
    },
    shieldstill: {
      name: 'Still shield', view: 'cryostat', cat: 'Structure and shields',
      where: 'Hangs from the still plate', temp: 'About 800 mK', tempK: 0.8,
      text: [
        'The innermost radiation shield. It must be light-tight: even small gaps let in enough infrared to warm the base plate and disturb the qubits.',
      ],
    },
    platecold: {
      name: 'Cold plate', view: 'cryostat', cat: 'Structure and shields',
      where: 'Between still and mixing chamber', temp: 'About 100 mK', tempK: 0.1,
      text: [
        'An intermediate stage cooled by the heat exchangers. It gives cables and attenuators one more place to shed heat before the coldest stage.',
      ],
    },
    platemxc: {
      name: 'Mixing chamber plate', view: 'cryostat', cat: 'Structure and shields',
      where: 'Bottom of the dilution unit', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'The coldest plate. The processor, quantum-limited amplifiers, isolators and final filters all hang beneath it.',
        'Cooling power here is only microwatts at 20 mK, so every component on this plate is chosen to dissipate almost nothing.',
      ],
      links: ['mxc', 'package', 'twpa'],
    },
    rods: {
      name: 'G10 support rods', view: 'cryostat', cat: 'Structure and shields',
      where: 'Between every pair of plates', temp: 'Spans the stages', tempK: 4,
      text: [
        'Thin-walled fibreglass-epoxy (G10) tubes hold each plate below the one above. They are stiff but conduct very little heat.',
      ],
    },
    pulsetube: {
      name: 'Pulse tube cold head', view: 'cryostat', cat: 'Cooling',
      where: 'Top plate to 4 K plate', temp: '300 K \u2192 4 K', tempK: 30,
      text: [
        'A cryocooler with no moving parts in its cold section. Oscillating helium gas in its regenerator and tubes carries heat upward, cooling the first stage to about 50 K and the second to about 4 K.',
      ],
      links: ['braids', 'compressor', 'rotvalve'],
    },
    braids: {
      name: 'Copper thermal braids', view: 'cryostat', cat: 'Cooling',
      where: 'Pulse tube to 50 K and 4 K plates', temp: '50 K and 4 K', tempK: 10,
      text: [
        'Soft braided copper links connect the pulse tube stages to the plates. They conduct heat well but are flexible, so the pulse tube\u2019s vibrations don\u2019t shake the plates and the qubits.',
      ],
    },
    heatswitch: {
      name: 'Heat switches', view: 'cryostat', cat: 'Cooling',
      where: '4 K to still, still to mixing chamber', temp: 'Spans the stages', tempK: 0.5,
      text: [
        'During cooldown these switches conduct heat from the lower plates up to the 4 K stage, shortening the initial cooldown. Once the dilution cycle starts they open and thermally isolate the coldest stages.',
      ],
    },
    pumpline: {
      name: 'Still pumping line', view: 'cryostat', cat: 'Cooling',
      where: 'Top plate to the still', temp: '300 K \u2192 800 mK', tempK: 20,
      text: [
        'A wide tube that carries helium-3 vapour from the still up to the gas handling system. It is wide because gas at such low pressure needs a large opening to flow quickly.',
      ],
      links: ['still', 'turbo'],
    },
    still: {
      name: 'Still', view: 'cryostat', cat: 'Cooling',
      where: 'Under the still plate', temp: 'About 800 mK', tempK: 0.8,
      text: [
        'The chamber where helium-3 is distilled out of the mixture. Helium-3 evaporates much more readily than helium-4, so pumping on the still removes mostly helium-3. A small heater keeps the flow steady.',
      ],
      links: ['pumpline', 'mxc'],
    },
    condline: {
      name: 'Condensing line and flow impedance', view: 'cryostat', cat: 'Cooling',
      where: 'Top plate down to the heat exchangers', temp: '300 K \u2192 mK', tempK: 2,
      text: [
        'Returning helium-3 gas runs down this capillary, is pre-cooled by the pulse tube stages, and liquefies after passing a narrow flow restriction (the coiled section). It then continues through the heat exchangers to the mixing chamber.',
      ],
      links: ['chx'],
    },
    chx: {
      name: 'Continuous heat exchanger', view: 'cryostat', cat: 'Cooling',
      where: 'Still to cold plate', temp: '800 mK \u2192 100 mK', tempK: 0.3,
      text: [
        'A long coiled counterflow tube. Incoming helium-3 is pre-cooled by the cold, dilute stream leaving the mixing chamber without the two streams mixing.',
      ],
      links: ['shx', 'mxc'],
    },
    shx: {
      name: 'Step heat exchangers', view: 'cryostat', cat: 'Cooling',
      where: 'Below the cold plate', temp: 'About 30\u2013100 mK', tempK: 0.05,
      text: [
        'Blocks filled with sintered silver powder, which has an enormous surface area. That area is needed to beat the thermal boundary resistance between liquid helium and metal at millikelvin temperatures.',
      ],
    },
    mxc: {
      name: 'Mixing chamber', view: 'cryostat', cat: 'Cooling',
      where: 'On the mixing chamber plate', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Where the cooling happens. Below about 0.87 K the helium mixture separates into a helium-3-rich layer floating on a dilute layer. When helium-3 atoms are drawn across the boundary into the dilute layer they absorb heat, similar to evaporation but occurring inside a liquid.',
        'Pumping on the still keeps drawing helium-3 across, holding the chamber near 10 mK continuously.',
      ],
      links: ['still', 'chx', 'platemxc'],
    },
    thermo: {
      name: 'Thermometers', view: 'cryostat', cat: 'Cooling',
      where: 'On every plate', temp: 'Each stage', tempK: 1,
      text: [
        'Calibrated ruthenium-oxide resistors report each stage\u2019s temperature. Special thermometers (such as CMN susceptibility or noise thermometers) check the very lowest temperatures.',
      ],
    },
    coax: {
      name: 'Stainless and cupronickel coax', view: 'cryostat', cat: 'Signal wiring',
      where: 'Top plate down to the processor', temp: 'Spans the stages', tempK: 4,
      text: [
        'Drive, flux and readout-probe signals travel down stainless-steel or cupronickel coax. These metals conduct heat poorly, which keeps heat from leaking to the cold stages, at the cost of some signal loss.',
      ],
      links: ['bulkheads', 'att'],
    },
    coaxsc: {
      name: 'Superconducting NbTi coax', view: 'cryostat', cat: 'Signal wiring',
      where: 'Mixing chamber to 4 K (output lines)', temp: '10 mK \u2192 4 K', tempK: 0.2,
      text: [
        'Niobium-titanium coax is superconducting below about 9 K, so it carries the weak readout signal with almost no loss while still conducting very little heat. It is used between the quantum-limited amplifier and the HEMT.',
      ],
      links: ['hemt', 'twpa'],
    },
    bulkheads: {
      name: 'Bulkheads and thermal anchors', view: 'cryostat', cat: 'Signal wiring',
      where: 'Every plate', temp: 'Each stage', tempK: 1,
      text: [
        'Every cable passes through a connector or clamp bolted to each plate. This forces the cable\u2019s outer conductor to the plate temperature, so heat entering at the top is removed stage by stage.',
      ],
    },
    att: {
      name: 'Cryogenic attenuators', view: 'cryostat', cat: 'Signal wiring',
      where: '4 K, still, cold and mixing chamber plates', temp: 'Each stage', tempK: 0.5,
      text: [
        'Drive lines carry about 60 dB of attenuation in total, a million-fold power reduction, spread across the stages, for example 20 dB at 4 K and more at colder plates.',
        'The goal is to remove thermal noise, not the signal (which is simply sent stronger). Each attenuator replaces warm noise from above with noise at its own colder temperature.',
      ],
      links: ['irfilter', 'coax'],
    },
    irfilter: {
      name: 'Infrared (Eccosorb) filters', view: 'cryostat', cat: 'Signal wiring',
      where: 'Under the mixing chamber plate', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Copper housings filled with a lossy, iron-loaded epoxy around a centre conductor. They absorb infrared and very high-frequency radiation that would break Cooper pairs in the chip, while letting gigahertz control pulses through.',
      ],
      links: ['lpf', 'att'],
    },
    lpf: {
      name: 'Low-pass filters', view: 'cryostat', cat: 'Signal wiring',
      where: 'Under the mixing chamber plate', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Block frequencies above the control band. Flux lines get especially strong low-pass filtering because any noise on them makes the qubit frequency jitter.',
      ],
    },
    dcloom: {
      name: 'DC wiring loom', view: 'cryostat', cat: 'Signal wiring',
      where: 'Top plate to mixing chamber', temp: 'Spans the stages', tempK: 4,
      text: [
        'Twisted pairs of resistive or superconducting wire carry bias currents and thermometer signals. Twisting cancels magnetic pickup, and RC filters at cold stages remove residual noise.',
      ],
      links: ['dcsrc'],
    },
    flex: {
      name: 'Flex cables', view: 'cryostat', cat: 'Signal wiring',
      where: 'Top plate to mixing chamber', temp: 'Spans the stages', tempK: 4,
      text: [
        'Flexible printed ribbons carry many signal lines side by side, often as superconducting traces on polyimide. A ribbon is far thinner than coax and conducts less heat, so a fridge can hold hundreds more lines.',
      ],
      links: ['coax'],
    },
    hemt: {
      name: 'HEMT amplifier', view: 'cryostat', cat: 'Readout amplifiers',
      where: 'Under the 4 K plate', temp: 'About 4 K', tempK: 4,
      text: [
        'A high-electron-mobility transistor amplifier giving about 40 dB of gain. It adds noise worth several photons, so a quantum-limited amplifier must come first.',
        'It also dissipates milliwatts of power, which only the 4 K stage can absorb.',
      ],
      links: ['twpa', 'coaxsc'],
    },
    isolator: {
      name: 'Isolators and circulators', view: 'cryostat', cat: 'Readout amplifiers',
      where: 'Under the mixing chamber plate', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'One-way valves for microwaves, built from magnetised ferrite. Signals from the chip pass upward; noise travelling down from warmer amplifiers is diverted into a cold termination.',
        'They sit before and after the TWPA and are magnetically shielded so their magnets don\u2019t disturb the qubits.',
      ],
      links: ['twpa'],
    },
    dircoupler: {
      name: 'Directional coupler', view: 'cryostat', cat: 'Readout amplifiers',
      where: 'Readout chain, mixing chamber', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Adds the TWPA\u2019s strong pump tone into the readout line through a weakly coupled port, while the signal passes straight through.',
      ],
    },
    twpa: {
      name: 'Traveling-wave parametric amplifier', view: 'cryostat', cat: 'Readout amplifiers',
      where: 'Under the mixing chamber plate', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'A transmission line built from thousands of Josephson junctions. A strong pump tone travels with the weak readout signal and transfers energy into it, amplifying it about 20 dB while adding close to the minimum noise quantum mechanics allows.',
        'Its gigahertz-wide bandwidth lets one amplifier serve many frequency-multiplexed qubits.',
      ],
      links: ['isolator', 'hemt', 'dircoupler'],
    },
    coldfinger: {
      name: 'Cold finger', view: 'cryostat', cat: 'Sample stage',
      where: 'Below the mixing chamber plate', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'A rod of oxygen-free high-conductivity copper that extends the mixing chamber\u2019s cold down into the shields and holds the sample package. Oxygen-free copper conducts heat well and contains no magnetic impurities.',
      ],
    },
    magshield: {
      name: 'Magnetic shield', view: 'cryostat', cat: 'Sample stage',
      where: 'Around the sample package', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'A can of high-permeability alloy (mu-metal or Cryoperm) that steers Earth\u2019s and the lab\u2019s magnetic fields around the processor. Field trapped in the superconducting film as vortices causes energy loss and frequency noise.',
      ],
      links: ['scshield'],
    },
    scshield: {
      name: 'Superconducting shield', view: 'cryostat', cat: 'Sample stage',
      where: 'Inside the magnetic shield', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'An aluminium or lead can inside the magnetic shield. Once superconducting it expels remaining field. Together, the two cans can suppress magnetic fields by more than 60 dB. The inside is often coated with infrared absorber.',
      ],
    },
    package: {
      name: 'Sample package', view: 'cryostat', cat: 'Sample stage',
      where: 'Bottom of the cold finger', temp: 'About 10 mK', tempK: 0.01, detail: 'package',
      text: [
        'The copper box that holds the chip, connects it to the coax cables, and shapes its microwave surroundings. Open the detailed view to take it apart.',
      ],
    },

    /* ---------------- Sample package ---------------- */
    pkgbase: {
      name: 'Copper base', view: 'package', cat: 'Package',
      where: 'Bolted to the cold finger', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Machined from oxygen-free high-conductivity copper, sometimes gold-plated or aluminium-coated. It draws heat from the chip into the mixing chamber and forms half of the enclosure around it.',
      ],
    },
    pcb: {
      name: 'Microwave circuit board', view: 'package', cat: 'Package',
      where: 'Around the chip', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'A low-loss board whose 50-ohm traces fan signals from the connectors to the chip edge. Rows of vias stitch its ground layers together so no stray resonances form.',
      ],
    },
    smp: {
      name: 'Coax connectors', view: 'package', cat: 'Package',
      where: 'Package edge', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Push-on SMP or screw-on SMA connectors link the package to the fridge coax. Each one carries a single drive, flux or readout signal.',
      ],
    },
    wirebonds: {
      name: 'Wirebonds', view: 'package', cat: 'Package',
      where: 'Chip edge to board', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Aluminium wires about 25 \u00b5m thick connect chip pads to board traces. Many more tie the chip\u2019s ground plane to board ground around the whole edge, suppressing unwanted modes.',
        'Large processors replace edge bonds with pogo pins or bump bonds so signals can reach the middle of the chip.',
      ],
      links: ['bondpad'],
    },
    pkglid: {
      name: 'Lid', view: 'package', cat: 'Package',
      where: 'Over the chip', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Closes the cavity above the chip. The cavity is sized so its own resonant modes sit far above the qubit frequencies, and tight seams keep stray radiation out.',
      ],
    },
    coil: {
      name: 'Bias coil', view: 'package', cat: 'Package',
      where: 'On the lid', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'A small coil of superconducting niobium-titanium wire that applies a uniform magnetic field, setting all flux-tunable qubits near their operating point without heating.',
      ],
    },
    absorber: {
      name: 'Infrared absorber', view: 'package', cat: 'Package',
      where: 'Inside the lid', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Black absorbing material that soaks up stray infrared photons before they reach the chip and create quasiparticles.',
      ],
    },
    pkgchip: {
      name: 'Quantum processor chip', view: 'package', cat: 'Package',
      where: 'Centre of the package', temp: 'About 10 mK', tempK: 0.01, detail: 'chip',
      text: [
        'A few millimetres across, carrying qubits, couplers, resonators and wiring made of superconducting film. Open the detailed view to see its circuits.',
      ],
    },

    /* ---------------- Chip ---------------- */
    substrate: {
      name: 'Silicon substrate', view: 'chip', cat: 'Chip structure',
      where: 'Base of the chip', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'A high-resistivity silicon (or sapphire) wafer about half a millimetre thick. Defects at its surfaces and interfaces, called two-level systems, are a leading cause of qubit energy loss.',
      ],
    },
    groundplane: {
      name: 'Ground plane', view: 'chip', cat: 'Chip structure',
      where: 'Top surface', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'A superconducting film (aluminium, niobium or tantalum, about 100\u2013200 nm thick) covering most of the chip. Circuits are formed by etching gaps into it; the dark lines you see are bare silicon.',
      ],
    },
    xmon: {
      name: 'Transmon qubit', view: 'chip', cat: 'Circuit elements',
      where: 'Qubit row', temp: 'About 10 mK', tempK: 0.01, detail: 'qubit',
      text: [
        'A cross-shaped superconducting island (the \u201cXmon\u201d layout) connected to ground through Josephson junctions. The junction\u2019s nonlinear inductance and the cross\u2019s capacitance form an oscillator with unevenly spaced energy levels; the lowest two, around 4\u20136 GHz apart, are the qubit\u2019s 0 and 1.',
        'Its large size makes it insensitive to stray electric charge.',
      ],
      links: ['squid', 'xyline', 'resonator'],
    },
    squid: {
      name: 'SQUID', view: 'chip', cat: 'Circuit elements',
      where: 'End of each qubit arm', temp: 'About 10 mK', tempK: 0.01, detail: 'qubit',
      text: [
        'Two Josephson junctions in a small loop. Magnetic flux through the loop changes their combined strength, so a current in the nearby flux line tunes the qubit\u2019s frequency.',
        'Fixed-frequency qubits, such as those on IBM\u2019s Heron, use a single junction instead.',
      ],
      links: ['zline', 'jjoxide'],
    },
    coupler: {
      name: 'Tunable coupler', view: 'chip', cat: 'Circuit elements',
      where: 'Between neighbouring qubits', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'A small transmon-like circuit between two qubits. Tuning its frequency switches the interaction between them on for a two-qubit gate and off the rest of the time, cutting crosstalk. IBM\u2019s Heron and Google\u2019s processors both use tunable couplers.',
      ],
    },
    resonator: {
      name: 'Readout resonator', view: 'chip', cat: 'Circuit elements',
      where: 'Above each qubit', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'A meandering quarter-wave transmission-line resonator at around 6\u20138 GHz. Its frequency shifts slightly depending on whether the qubit is in 0 or 1, so probing it with a microwave tone and measuring the returned phase reveals the qubit state.',
      ],
      links: ['purcell', 'feedline'],
    },
    purcell: {
      name: 'Purcell filter', view: 'chip', cat: 'Circuit elements',
      where: 'Between resonators and feedline', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'A filter resonator whose passband covers the readout frequencies but not the qubit frequencies. Readout stays fast, while qubits can\u2019t leak their energy out through the readout line (the Purcell effect).',
      ],
    },
    feedline: {
      name: 'Readout feedline', view: 'chip', cat: 'Circuit elements',
      where: 'Across the top of the chip', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'One line shared by several readout resonators, each at a different frequency. A comb of tones reads them all at once using frequency multiplexing, which keeps the cable count down.',
      ],
    },
    xyline: {
      name: 'XY drive line', view: 'chip', cat: 'Circuit elements',
      where: 'Below each qubit', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Weakly coupled to the qubit through a tiny capacitance. Microwave pulses at the qubit frequency rotate its state about the X or Y axis: single-qubit gates lasting tens of nanoseconds.',
      ],
    },
    zline: {
      name: 'Z flux line', view: 'chip', cat: 'Circuit elements',
      where: 'Next to each SQUID', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Current here threads magnetic flux through the SQUID, shifting the qubit frequency. Fast flux pulses bring neighbours into resonance for two-qubit gates.',
      ],
    },
    bondpad: {
      name: 'Bond pads and launchers', view: 'chip', cat: 'Circuit elements',
      where: 'Chip edges', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Wide pads where wirebonds land, tapering smoothly into the thin lines so the impedance stays at 50 ohms and signals don\u2019t reflect.',
      ],
    },
    airbridge: {
      name: 'Airbridges', view: 'chip', cat: 'Circuit elements',
      where: 'Across the lines', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Tiny metal arches joining the ground plane on both sides of a line. They keep both halves at the same potential, preventing spurious slotline modes, and let lines cross each other.',
      ],
    },
    bumps: {
      name: 'Indium bump bonds', view: 'chip', cat: '3D integration',
      where: 'Between the two chips', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'In flip-chip processors, thousands of soft indium bumps a few micrometres tall join the qubit chip face-down to a second chip. They carry signals and ground between chips and set a precise gap.',
      ],
    },
    carrier: {
      name: 'Wiring chip (flip-chip)', view: 'chip', cat: '3D integration',
      where: 'Face-down above the qubits', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'The second chip in a flip-chip stack. Moving control lines, resonators and filters onto it lets signals reach every qubit from above instead of from the crowded chip edge.',
      ],
    },
    tsv: {
      name: 'Through-silicon vias', view: 'chip', cat: '3D integration',
      where: 'Through the wiring chip', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Superconducting-lined holes through the silicon that bring signals vertically and connect the ground planes on both faces, suppressing unwanted modes in large chips.',
      ],
    },

    /* ---------------- Josephson junction close-up ---------------- */
    qsub: {
      name: 'Substrate (magnified)', view: 'qubit', cat: 'Junction layers',
      where: 'Under the junction', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'The same silicon as the chip, seen roughly 10,000 times larger. Surface cleanliness here directly affects how long the qubit keeps its state.',
      ],
    },
    qpad: {
      name: 'Qubit island and ground', view: 'qubit', cat: 'Junction layers',
      where: 'Either side of the SQUID', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'The end of the transmon\u2019s arm (left) and the ground plane (right). The SQUID bridges the gap between them. The island\u2019s capacitance sets the charging energy, typically around 200 MHz in frequency units.',
      ],
    },
    jjbottom: {
      name: 'Bottom electrode', view: 'qubit', cat: 'Junction layers',
      where: 'First aluminium layer', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Junctions are usually made by double-angle shadow evaporation: aluminium is evaporated at one angle through a suspended resist mask to form this first electrode.',
      ],
    },
    jjoxide: {
      name: 'Tunnel barrier (AlOx)', view: 'qubit', cat: 'Junction layers',
      where: 'Between the electrodes', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'Oxygen is let into the chamber so a 1\u20132 nm layer of aluminium oxide grows on the first electrode. Cooper pairs tunnel through this insulator coherently through the Josephson effect, so the junction acts as a lossless, nonlinear inductor.',
        'The barrier thickness, controlled almost atom by atom, sets the qubit frequency, so making thousands of identical junctions is a major challenge.',
      ],
    },
    jjtop: {
      name: 'Top electrode', view: 'qubit', cat: 'Junction layers',
      where: 'Second aluminium layer', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'A second evaporation at a different angle overlaps the first, completing the junction. Each overlap is only about 0.01\u20130.1 \u00b5m\u00b2.',
      ],
    },
    qloop: {
      name: 'SQUID loop', view: 'qubit', cat: 'Junction layers',
      where: 'Around the two junctions', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'The loop joining the two junctions. Its area sets how much flux a given flux-line current threads through it.',
      ],
    },
    qflux: {
      name: 'Flux line end', view: 'qubit', cat: 'Junction layers',
      where: 'Beside the loop', temp: 'About 10 mK', tempK: 0.01,
      text: [
        'The end of the Z line, shorted to ground right beside the loop so the magnetic field of its current passes through the SQUID.',
      ],
    },
  };

  QC.TOUR = [
    { part: 'rack', note: 'Start outside the fridge, where pulses are created and results are read.' },
    { part: 'compressor', note: 'Cooling starts with a compressor feeding the pulse tube.' },
    { part: 'ghs', note: 'A second loop circulates the helium mixture that reaches millikelvin.' },
    { part: 'plate50', note: 'Inside, nested stages step the temperature down.' },
    { part: 'pulsetube', note: 'The pulse tube cools the top two stages.' },
    { part: 'still', note: 'The dilution unit takes over below 4 K.' },
    { part: 'mxc', note: 'The coldest point: about 10 mK.' },
    { part: 'att', note: 'Control signals are deliberately weakened on the way down.' },
    { part: 'irfilter', note: 'Filters stop stray radiation at the last stage.' },
    { part: 'twpa', note: 'Readout signals are amplified at millikelvin first.' },
    { part: 'hemt', note: 'Then again at 4 K.' },
    { part: 'wirebonds', note: 'Signals reach the chip through the sample package.' },
    { part: 'xmon', note: 'The qubit itself: a superconducting circuit.' },
    { part: 'resonator', note: 'Each qubit is read out through its own resonator.' },
    { part: 'jjoxide', note: 'And at its heart, a nanometre-thin tunnel barrier.' },
  ];
})();
