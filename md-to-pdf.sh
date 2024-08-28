set -e

pandoc -d md-to-html.yaml
pandoc -d html-to-pdf.yaml --metadata date="`date -u "+%Y-%m-%d"`"
rm output.html
mv output.pdf revs/frpotゼミ資料.pdf
echo "✅ Generate succeded."
