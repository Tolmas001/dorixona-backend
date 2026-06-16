import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Product } from '../types';

type BodyPart = 'head' | 'chest' | 'stomach' | 'heart' | 'lungs' | 'legs' | 'arms';

const BODY_PART_MEDICINES: Record<BodyPart, string[]> = {
  head: ['Migren', 'Stress', 'Uyqu buzilishi', 'Oq', 'Bahs'],
  chest: ['Stenokardia', 'Qalbning atis', 'Asma', 'Bronxit'],
  stomach: ['Ohim', 'Dispepsiya', 'Kolit', 'Toksikoinfekciya'],
  heart: ['Gipertoniya', 'Hipotenziya', 'Aritmiya', 'Qalbning yetishmovchiligi'],
  lungs: ['Pnevmoniya', 'Tuberkulyoz', 'Asma', 'Bronxit'],
  legs: ['Variks', 'Artrit', 'Poliartrит', 'Trofik yara'],
  arms: ['Artrit', 'Tendinit', 'Reopartrit', 'Myozit'],
};

export function AnatomyViewer({ products }: { products: Product[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPart, setSelectedPart] = useState<BodyPart>('head');
  const [medicines, setMedicines] = useState<Product[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const bodyPartsRef = useRef<Record<BodyPart, THREE.Mesh | THREE.Mesh[]>>({} as any);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f9f7);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(5, 5, 5);
    light.castShadow = true;
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Create human body
    const bodyParts: Record<BodyPart, THREE.Mesh | THREE.Mesh[]> = {} as any;

    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4a460,
      roughness: 0.5,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.2;
    head.castShadow = true;
    head.userData.bodyPart = 'head';
    scene.add(head);
    bodyParts.head = head;

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 1.35, 0.25);
    scene.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 1.35, 0.25);
    scene.add(rightEye);

    // Torso (Chest)
    const torsoGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.25);
    const torsoMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4a460,
      roughness: 0.5,
    });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 0.4;
    torso.castShadow = true;
    torso.userData.bodyPart = 'chest';
    scene.add(torso);
    bodyParts.chest = torso;

    // Heart
    const heartGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const heartMaterial = new THREE.MeshStandardMaterial({ color: 0xba1a1a });
    const heart = new THREE.Mesh(heartGeometry, heartMaterial);
    heart.position.set(-0.05, 0.6, 0.15);
    heart.castShadow = true;
    heart.userData.bodyPart = 'heart';
    scene.add(heart);
    bodyParts.heart = heart;

    // Lungs
    const lungGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const lungMaterial = new THREE.MeshStandardMaterial({ color: 0x87ceeb });
    const leftLung = new THREE.Mesh(lungGeometry, lungMaterial);
    leftLung.position.set(-0.15, 0.5, 0.05);
    leftLung.castShadow = true;
    leftLung.userData.bodyPart = 'lungs';
    scene.add(leftLung);

    const rightLung = new THREE.Mesh(lungGeometry, lungMaterial);
    rightLung.position.set(0.15, 0.5, 0.05);
    rightLung.castShadow = true;
    rightLung.userData.bodyPart = 'lungs';
    scene.add(rightLung);
    bodyParts.lungs = [leftLung, rightLung];

    // Stomach
    const stomachGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const stomachMaterial = new THREE.MeshStandardMaterial({
      color: 0xcd853f,
      roughness: 0.7,
    });
    const stomach = new THREE.Mesh(stomachGeometry, stomachMaterial);
    stomach.position.y = -0.1;
    stomach.castShadow = true;
    stomach.userData.bodyPart = 'stomach';
    scene.add(stomach);
    bodyParts.stomach = stomach;

    // Arms
    const armGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4a460,
      roughness: 0.5,
    });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.35, 0.5, 0);
    leftArm.castShadow = true;
    leftArm.userData.bodyPart = 'arms';
    scene.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.35, 0.5, 0);
    rightArm.castShadow = true;
    rightArm.userData.bodyPart = 'arms';
    scene.add(rightArm);
    bodyParts.arms = [leftArm, rightArm];

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.15, 0.7, 0.15);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4a460,
      roughness: 0.5,
    });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, -0.8, 0);
    leftLeg.castShadow = true;
    leftLeg.userData.bodyPart = 'legs';
    scene.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, -0.8, 0);
    rightLeg.castShadow = true;
    rightLeg.userData.bodyPart = 'legs';
    scene.add(rightLeg);
    bodyParts.legs = [leftLeg, rightLeg];

    bodyPartsRef.current = bodyParts;

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);
      head.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    // Mouse click handler
    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const allParts = [
        head,
        torso,
        heart,
        leftLung,
        rightLung,
        stomach,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
      ];
      const intersects = raycasterRef.current.intersectObjects(allParts);

      if (intersects.length > 0) {
        const clicked = intersects[0].object as THREE.Mesh;
        const part = clicked.userData.bodyPart as BodyPart;
        if (part) {
          setSelectedPart(part);
          handleBodyPartClick(part);
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      renderer.domElement.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  const handleBodyPartClick = (part: BodyPart) => {
    const symptoms = BODY_PART_MEDICINES[part];
    const filtered = products.filter(
      (p) =>
        symptoms.some((symptom) =>
          p.name.toLowerCase().includes(symptom.toLowerCase())
        ) ||
        symptoms.some((symptom) => p.manufacturer?.toLowerCase().includes(symptom.toLowerCase()))
    );

    setMedicines(filtered.length > 0 ? filtered : products.slice(0, 5));
  };

  return (
    <div className="anatomy-viewer">
      <div className="anatomy-container" ref={containerRef} />
      <div className="anatomy-info">
        <h3>Tanlangan: {selectedPart.toUpperCase()}</h3>
        <p>3D modelga kliklang dorilarni ko'rish uchun</p>

        {medicines.length > 0 && (
          <div className="anatomy-medicines">
            <h4>Tavsiy etilgan dorilar:</h4>
            <div className="medicines-grid">
              {medicines.map((medicine) => (
                <div key={medicine.id} className="medicine-card-small">
                  <strong>{medicine.name}</strong>
                  <p>{medicine.manufacturer || medicine.sku || 'Mahsulot'}</p>
                  <span className="price">{Number(medicine.price || medicine.sellingPrice || 0).toLocaleString()} so'm</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
