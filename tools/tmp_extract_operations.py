import pathlib
text = pathlib.Path('src/App.jsx').read_text(encoding='utf-8')
ops_marker = 'className="panel operations"'
start_idx = text.rfind('<section', 0, text.index(ops_marker))
end_idx = text.index('</section', text.index(ops_marker)) + len('</section')
print(text[start_idx:end_idx])
