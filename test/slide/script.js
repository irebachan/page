const resizer = document.getElementById('resizer');
const textbox1 = document.getElementById('textbox1');
const textbox2 = document.getElementById('textbox2');
const container = document.querySelector('.container');
const radioButtons = document.querySelectorAll('input[name="orientation"]');

let isResizing = false;
let isHorizontal = true;

resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
});

radioButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'horizontal') {
            container.classList.remove('vertical');
            container.classList.add('horizontal');
            resizer.style.cursor = 'ew-resize';
            isHorizontal = true;
        } else {
            container.classList.remove('horizontal');
            container.classList.add('vertical');
            resizer.style.cursor = 'ns-resize';
            isHorizontal = false;
        }
        // 比率をリセット
        textbox1.style.flexBasis = '';
        textbox2.style.flexBasis = '';
    });
});

const onMouseMove = (e) => {
    if (!isResizing) return;

    const containerRect = container.getBoundingClientRect();
    let offset, size1, size2;

    if (isHorizontal) {
        offset = e.clientX - containerRect.left;
        size1 = (offset / containerRect.width) * 100;
    } else {
        offset = e.clientY - containerRect.top;
        size1 = (offset / containerRect.height) * 100;
    }

    size2 = 100 - size1;

    textbox1.style.flexBasis = `${size1}%`;
    textbox2.style.flexBasis = `${size2}%`;
};

const onMouseUp = () => {
    isResizing = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
};
