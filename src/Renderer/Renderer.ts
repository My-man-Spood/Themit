import { Editor } from './Editor';
import './styles/styles.scss';

runEditor();

function runEditor() {
    const editor = new Editor();

    document.getElementById('browser')?.addEventListener('click', () => {
        editor.openFile();
    });
}
