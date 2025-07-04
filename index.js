let renderer, scene, camera
let cameraControl, stats, gui

// points
const pointCount = 10000
const movementSpeed = 20
let explosion
let size = 20
const textureLoader = new THREE.TextureLoader()
const smokeTexture = textureLoader.load('./smoke.png')
// Add OBJLoader
const objLoader = new THREE.OBJLoader()
let rock // Variable to store the loaded rock model

// WebSocket configuration
const wsURL = 'ws://127.0.0.1:9980'
const fetchInterval = 1000 / 25 // 25 FPS
let ws

// Stones
const MAX_STONES = 15
let stones = [] // cloned rock meshes

// Stone scale factor
let stoneScale = 0.4

function updateStoneScale(value) {
  stoneScale = value
  stones.forEach(s => {
    s.scale.set(50 * stoneScale, 50 * stoneScale, 50 * stoneScale)
  })
}

// URL hash parameters
let urlParams = {}
let statusCheckURL = '127.0.0.1:20597/status'
let cleanMode = false
let statusCheckInterval = null

// Parse URL hash parameters
function parseHashParams() {
  const hash = window.location.hash.substring(1)
  if (!hash) return {}
  
  try {
    // Check if it's base64 encoded
    const decoded = atob(hash)
    return JSON.parse(decoded)
  } catch (e) {
    // If not base64, try regular parsing
    const params = {}
    hash.split('&').forEach(param => {
      const [key, value] = param.split('=')
      if (key && value) {
        params[key.trim()] = value.trim()
      }
    })
    return params
  }
}

var hadBeenTriggered = false;
// Check status from URL
function checkStatus() {
  if (
    hadBeenTriggered === false &&
    (urlParams.clean === 'true' || urlParams.clean === true)
  ) {
    fetch(`http://${statusCheckURL}`)
    .then(response => response.text())
    .then(text => {
      if (text.trim() === 'True') {
        // Trigger explosion
        if (controls) {
          hadBeenTriggered = true;
          controls.explosionTrigger()
        }
      }
    })
    .catch(error => console.error('Status check error:', error))
}
}

// Add MTLLoader along with OBJLoader
const mtlLoader = new THREE.MTLLoader()

function loadRockModel() {
  // Add a loading indicator
  console.log('Loading rock model...')
  
  // First load the material file
  mtlLoader.setPath('./Rock1/')
  mtlLoader.load(
    'Rock1.mtl',
    function(materials) {
      materials.preload();
      
      // After material is loaded, configure the object loader to use it
      objLoader.setMaterials(materials);
      objLoader.setPath('./Rock1/');
      
      // Now load the object with materials applied
      objLoader.load(
        'Rock1.obj', 
        function(object) {
          // Position the rock at 0,0,0
          object.position.set(0, 0, 0)
          
          // Scale the rock to be more visible
          object.scale.set(50 * stoneScale, 50 * stoneScale, 50 * stoneScale)
          
          // Hide the ground plane if present in the model
          object.traverse(child => {
            if (child.isMesh && child.name && child.name.toLowerCase().includes('plane')) {
              child.visible = false
            }
          })

          rock = object
          console.log('Rock model loaded successfully')

          // Create clones for stones
          for (let i = 0; i < MAX_STONES; i++) {
            const clone = object.clone()
            clone.position.set(0, 0, 0)
            clone.userData.rotationSpeed = new THREE.Vector3(
              Math.random() * 0.02 - 0.01,
              Math.random() * 0.02 - 0.01,
              Math.random() * 0.02 - 0.01
            )
            stones.push(clone)
            scene.add(clone)
          }

          // Apply scale to all stones
          updateStoneScale(stoneScale)
      
      // Add a helper box around the rock to visualize its boundaries
      //const box = new THREE.Box3().setFromObject(rock);
      //const helper = new THREE.Box3Helper(box, 0xffff00);
      //scene.add(helper);
        },
        function(xhr) {
          console.log('Rock model ' + (xhr.loaded / xhr.total * 100) + '% loaded')
        },
        function(error) {
          console.error('Error loading rock model:', error)
        }
      )
    },
    undefined,
    function(error) {
      console.error('Error loading materials:', error);
    }
  )
}


function initStats() {
  const stats = new Stats()
  stats.setMode(0)
  document.getElementById('stats').appendChild(stats.domElement)
  return stats
}

// dat.GUI
let controls = new (function() {
  this.explosionTrigger = function() {
    if (explosion) {
      explosion.destroy()
    }
    explosion = new Explosion(0, 0)

    // Hide the rock when explosion is triggered
    stones.forEach(s => {
      s.visible = false
    })
  }
  this.pointSize = 20
  this.cameraNear = 500
  this.stoneScale = stoneScale
  // this.pointCount = 1000
  
  // Add light position controls
  this.lightX = -0.4
  this.lightY = -1.3
  this.lightZ = 10
})()

// 建立粒子系統
class Explosion {
  constructor(x, y) {
    const geometry = new THREE.Geometry()

    this.material = new THREE.PointsMaterial({
      size: size,
      color: new THREE.Color(Math.random() * 0xffffff),
      map: smokeTexture,
      blending: THREE.AdditiveBlending,
      depthTest: false
      // transparent: true,
      // opacity: 0.7
    })

    this.pCount = pointCount
    this.movementSpeed = movementSpeed
    this.dirs = []

    for (let i = 0; i < this.pCount; i++) {
      const vertex = new THREE.Vector3(x, y, 0) // 每個頂點起點都在爆炸起源點
      geometry.vertices.push(vertex)
      const r = this.movementSpeed * THREE.Math.randFloat(0, 1) + 2
      // 噴射方向隨機 -> 不規則球體
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      this.dirs.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi)
      })
      // 噴射方向隨機 -> 正方體
      // this.dirs.push({
      //   x: Math.random() * r - r / 2,
      //   y: Math.random() * r - r / 2,
      //   z: Math.random() * r - r / 2
      // })
    }

    let points = new THREE.Points(geometry, this.material)

    this.object = points

    scene.add(this.object)
  }

  update() {
    let p = this.pCount
    const d = this.dirs
    while (p--) {
      let particle = this.object.geometry.vertices[p]
      // 每個頂點往自己噴射方向一直移動，會漸漸淡出是也可見範圍，但他仍一直在運動
      particle.x += d[p].x
      particle.y += d[p].y
      particle.z += d[p].z
    }
    this.object.geometry.verticesNeedUpdate = true
  }

  destroy() {
    this.object.geometry.dispose()
    scene.remove(this.object)
    // console.log(renderer.info)
    this.dirs.length = 0
  }
}

function initWebSocket() {
  ws = new WebSocket(wsURL)
  ws.addEventListener('open', () => {
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('GBS')
      }
    }, fetchInterval)
  })
  ws.addEventListener('message', event => {
    try {
      const data = JSON.parse(event.data)
      if (Array.isArray(data)) {
        for (let i = 0; i < Math.min(MAX_STONES, data.length); i++) {
          const pair = data[i]
          if (Array.isArray(pair) && pair.length >= 2) {
            // 正規化座標 (0~1) 轉換為世界座標
            const [normalizedX, normalizedY] = pair
            
            // 計算視口範圍，考慮相機的視野角度和距離
            const distance = camera.position.z
            const vFOV = camera.fov * Math.PI / 180 // 轉換為弧度
            const height = 2 * Math.tan(vFOV / 2) * distance
            const width = height * camera.aspect
            
            // 將正規化座標 (0~1) 轉換為世界座標
            // 0,0 對應左下角，1,1 對應右上角
            const worldX = (normalizedX - 0.5) * width
            const worldY = (normalizedY - 0.5) * height
            
            if (stones[i]) stones[i].position.set(worldX, worldY, 0)
          }
        }
      }
    } catch (e) {
      console.error('Invalid WS data', e)
    }
  })

  ws.addEventListener('error', err => {
    console.error('WebSocket error:', err)
  })
}

function init() {
  // Get URL parameters from hash
  urlParams = parseHashParams()

  if (urlParams.scale || urlParams.stoneScale) {
    const v = parseFloat(urlParams.scale || urlParams.stoneScale)
    if (!isNaN(v)) {
      stoneScale = v
    }
  }

  controls.stoneScale = stoneScale
  
  // Set clean mode if specified
  if (urlParams.clean === 'true' || urlParams.clean === true || urlParams.clear === 'true' || urlParams.clear === true) {
    cleanMode = true
  }
  
  // Set status check URL if specified
  if (urlParams.listenURL) {
    statusCheckURL = urlParams.listenURL
  }
  
  // scene
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x000000, 0.0008)

  // camera
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    500,
    5000
  )
  camera.position.set(0, 0, 1000)
  camera.lookAt(scene.position)

  // Add lights so we can see the rock
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); 
  scene.add(ambientLight);
 
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(controls.lightX, controls.lightY, controls.lightZ);
  scene.add(directionalLight);

  // renderer
  renderer = new THREE.WebGLRenderer({ alpha: true })
  renderer.setClearColor(0x000000, 0)
  renderer.setSize(window.innerWidth, window.innerHeight)

  // Load the rock model
  loadRockModel();

  // Only initialize stats and GUI if not in clean mode
  if (!cleanMode) {
    // stats
    stats = initStats()
    
    // dat.GUI
    gui = new dat.GUI()
    gui.add(controls, 'explosionTrigger')
    gui.add(controls, 'pointSize', 10, 200).onChange(e => {
      size = e
    })
    gui.add(controls, 'cameraNear', 1, 1000).onChange(near => {
      camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        near,
        5000
      )
      camera.position.set(0, 0, 1000)
      camera.lookAt(scene.position)
    })
    gui.add(controls, 'stoneScale', 0.1, 5).onChange(value => {
      updateStoneScale(value)
    })
    
    // Add light position controls
    const lightFolder = gui.addFolder('Light Position')
    lightFolder.add(controls, 'lightX', -10, 10).onChange(value => {
      directionalLight.position.x = value
    })
    lightFolder.add(controls, 'lightY', -10, 10).onChange(value => {
      directionalLight.position.y = value
    })
    lightFolder.add(controls, 'lightZ', -10, 20).onChange(value => {
      directionalLight.position.z = value
    })
    lightFolder.open()
  } else {
    // Hide stats element in clean mode
    const statsEl = document.getElementById('stats')
    if (statsEl) {
      statsEl.style.display = 'none'
    }
  }

  document.body.appendChild(renderer.domElement)

  // Initialize WebSocket after scene setup
  initWebSocket()
}

function render() {
  if (explosion) {
    explosion.update()
  }

  stones.forEach(s => {
    if (s.userData.rotationSpeed) {
      s.rotation.x += s.userData.rotationSpeed.x
      s.rotation.y += s.userData.rotationSpeed.y
      s.rotation.z += s.userData.rotationSpeed.z
    }
  })

  if (stats) {
    stats.update()
  }
  
  requestAnimationFrame(render)
  // cameraControl.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Initialize status checking when document is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Start polling status URL every 100ms
  if (urlParams.clean === 'true' || urlParams.clean === true) {
    statusCheckInterval = setInterval(checkStatus, 100);
}
});

init()
render()
