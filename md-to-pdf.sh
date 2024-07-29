set -e

pandoc -d md-to-html.yaml
pandoc -d html-to-pdf.yaml
rm output.html
mv output.pdf revs/SLAMFRPゼミ資料.pdf
echo "✅ Generate succeded."
