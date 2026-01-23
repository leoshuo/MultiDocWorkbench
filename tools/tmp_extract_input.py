import pathlib
text = pathlib.Path('src/App.jsx').read_text(encoding='utf-8')
input_marker = 'className="panel fill input-panel"'
preview_marker = 'className="panel fill preview-panel"'
start_idx = text.rfind('<section', 0, text.index(input_marker))
end_idx = text.index('<section', text.index(preview_marker))
print(text[start_idx:end_idx])
