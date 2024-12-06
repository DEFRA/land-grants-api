find ./docs -name '*.puml' -exec sh -c '
    for file do
        npx puml "$file" -o "${file%.puml}.png"
    done
' sh {} +