//find elements
const btnGenerate = $("#btnGenerate")
const inSeed = $("#seed")
const inSize = $("#size")
const inTilesize = $("#tilesize")
const inAmplitude = $("#amplitude")
const inFrequency = $("#frequency")
const inOctaves = $("#octaves")
const inPersistence = $("#persistence")
const inMin = $("#min")
const inMax = $("#max")
const inAutogenerate = $("#autogenerate")
const outSize = $("output[name=size]")
const outTileSize = $("output[name=tilesize]")
const outAmplitude = $("output[name=amplitude]")
const outFrequency = $("output[name=frequency]")
const outOctaves = $("output[name=octaves]")
const outPersistence = $("output[name=persistence]")

let seed = Math.random()
let size = 16
let tilesize = 8
let amplitude = 1
let frequency = 0.1
let octaves = 1
let persistence = 0.1
let min = 0
let max = 1
let autogenerate = false

inSize.on("input change", function () {
  size = Math.pow(2, this.value)
  updateUi()
})

inTilesize.on("input change", function () {
  tilesize = Math.pow(2, this.value)
  updateUi()
})

inAmplitude.on("input change", function () {
  amplitude = this.value
  updateUi()
})

inFrequency.on("input change", function () {
  frequency = this.value
  updateUi()
})

inOctaves.on("input change", function () {
  octaves = this.value
  updateUi()
})

inPersistence.on("input change", function () {
  persistence = this.value
  updateUi()
})

inMin.on("input change", function () {
  min = this.value
  updateUi()
})

inMax.on("input change", function () {
  max = this.value
  updateUi()
})

inSeed.on("input change", function () {
  seed = this.value
  updateUi()
})

function updateUi() {
  inSeed.val(seed)
  inAmplitude.val(amplitude)
  inAutogenerate.val(autogenerate)
  inFrequency.val(frequency)
  inMax.val(max)
  inMin.val(min)
  inOctaves.val(octaves)
  inPersistence.val(persistence)
  inSize.val(Math.log2(size))
  inTilesize.val(Math.log2(tilesize))

  outSize.val(size)
  outTileSize.val(tilesize)
  outAmplitude.val(amplitude)
  outFrequency.val(frequency)
  outOctaves.val(octaves)
  outPersistence.val(persistence)
}

btnGenerate.click(function () {
  $.post(
    "/mapgen/generate",
    {
      seed: seed,
      size: size,
      tilesize: tilesize,
      amplitude: amplitude,
      frequency: frequency,
      octaves: octaves,
      persistence: persistence,
      min: min,
      max: max,
    },
    function (data, status, jqXhr) {
      console.log("finished creatting map")
    }
  )
})

updateUi()
