import pathlib
text = pathlib.Path('src/App.jsx').read_text(encoding='utf-8')
processing_marker = 'className="panel processing"'
operations_marker = 'className="panel operations"'
start_idx = text.rfind('<section', 0, text.index(processing_marker))
end_idx = text.rfind('<section', 0, text.index(operations_marker))
print(text[start_idx:end_idx])
