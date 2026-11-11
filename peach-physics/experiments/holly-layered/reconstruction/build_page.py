"""Create an opt-in runner from the preserved baseline; never change that file."""
from pathlib import Path
p=Path(__file__).resolve().parent
source=(p.parent/'r6.html').read_text()
source=source.replace('<head>','<head>\n<base href="../">',1)
source=source.replace('<script src="renderer.js"></script>','<script src="renderer.js"></script>\n<script src="reconstruction/renderer.js"></script>',1)
source=source.replace("const labLayered=labParams.get('mode')==='layered';","const labLayered=true;")
source=source.replace('holly-layer-lab-v','holly-source-repair-v')
source=source.replace('← Holly lab · r6','← Holly lab · source repair')
(p/'index.html').write_text(source)
print('Built separate reconstruction runner with unchanged solver/input.')
