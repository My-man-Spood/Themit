import { Editor } from './Editor';
import './styles/styles.scss';

runEditor();

function runEditor() {
    const editor = new Editor();
    document.getElementById('build')?.addEventListener('click', () => {
        window['electron'].buildProject().then(() => {
            alert('Build complete!');
        });
    });
}
