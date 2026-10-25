// Leitura de recursos compilados do Source 2 (_c): lista blocos e extrai o bloco DATA.
using System;
using System.Collections.Generic;
using System.IO;

public class S2Block
{
    public string Type;
    public uint Offset; // absoluto no arquivo
    public uint Size;
}

public static class S2Resource
{
    public static List<S2Block> Blocks(byte[] file, out ushort headerVersion, out ushort typeVersion)
    {
        var r = new BinaryReader(new MemoryStream(file));
        r.ReadUInt32();                 // tamanho do arquivo
        headerVersion = r.ReadUInt16();
        typeVersion = r.ReadUInt16();
        long blockOffsetPos = r.BaseStream.Position;
        uint blockOffset = r.ReadUInt32();
        uint blockCount = r.ReadUInt32();
        r.BaseStream.Position = blockOffsetPos + blockOffset;
        var list = new List<S2Block>();
        for (int i = 0; i < blockCount; i++)
        {
            var b = new S2Block();
            b.Type = new string(r.ReadChars(4));
            long pos = r.BaseStream.Position;
            b.Offset = (uint)(pos + r.ReadUInt32());
            b.Size = r.ReadUInt32();
            list.Add(b);
        }
        return list;
    }

    // Escreve um recurso: cabeçalho v12 + tabela de blocos + blocos alinhados em 16 bytes.
    public static byte[] Write(ushort typeVersion, List<KeyValuePair<string, byte[]>> blocks)
    {
        Func<int, int> align = n => (n + 15) & ~15;
        int tableEnd = 16 + blocks.Count * 12;
        int cursor = align(tableEnd);
        var at = new int[blocks.Count];
        for (int i = 0; i < blocks.Count; i++) { at[i] = cursor; cursor = align(cursor + blocks[i].Value.Length); }
        int size = blocks.Count > 0 ? at[blocks.Count - 1] + blocks[blocks.Count - 1].Value.Length : tableEnd;
        var outb = new byte[size];
        var w = new BinaryWriter(new MemoryStream(outb));
        w.Write((uint)size);
        w.Write((ushort)12);
        w.Write(typeVersion);
        w.Write(8u);
        w.Write((uint)blocks.Count);
        for (int i = 0; i < blocks.Count; i++)
        {
            int o = 16 + i * 12;
            w.Seek(o, SeekOrigin.Begin);
            w.Write(System.Text.Encoding.ASCII.GetBytes(blocks[i].Key));
            w.Write((uint)(at[i] - (o + 4)));
            w.Write((uint)blocks[i].Value.Length);
            Buffer.BlockCopy(blocks[i].Value, 0, outb, at[i], blocks[i].Value.Length);
        }
        return outb;
    }

    // DATA de CSS/XML: CRC32(texto) + u16 0 (sem imagens) + texto UTF-8.
    static byte[] TextData(string text)
    {
        byte[] body = new System.Text.UTF8Encoding(false).GetBytes(text);
        var outb = new byte[6 + body.Length];
        BitConverter.GetBytes(Vpk.Crc32(body)).CopyTo(outb, 0);
        Buffer.BlockCopy(body, 0, outb, 6, body.Length);
        return outb;
    }

    static ushort TypeVersion(byte[] template)
    {
        ushort hv, tv;
        Blocks(template, out hv, out tv);
        return tv;
    }

    // Script (.vts_c): mantém os blocos do modelo e troca DATA pelo JS puro.
    public static byte[] CompileJs(string source, byte[] template)
    {
        ushort hv, tv;
        var list = new List<KeyValuePair<string, byte[]>>();
        foreach (var b in Blocks(template, out hv, out tv))
        {
            byte[] data = b.Type == "DATA" ? new System.Text.UTF8Encoding(false).GetBytes(source) : Block(template, b.Type);
            list.Add(new KeyValuePair<string, byte[]>(b.Type, data));
        }
        return Write(tv, list);
    }

    public static byte[] CompileCss(string source, byte[] template)
    {
        var list = new List<KeyValuePair<string, byte[]>>();
        list.Add(new KeyValuePair<string, byte[]>("RED2", Block(template, "RED2")));
        list.Add(new KeyValuePair<string, byte[]>("DATA", TextData(source)));
        return Write(TypeVersion(template), list);
    }

    public static byte[] CompileXml(string source, byte[] template)
    {
        var list = new List<KeyValuePair<string, byte[]>>();
        byte[] rerl = Block(template, "RERL");
        if (rerl != null) list.Add(new KeyValuePair<string, byte[]>("RERL", rerl));
        list.Add(new KeyValuePair<string, byte[]>("RED2", Block(template, "RED2")));
        list.Add(new KeyValuePair<string, byte[]>("DATA", TextData(source)));
        return Write(TypeVersion(template), list);
    }

    public static byte[] Block(byte[] file, string type)
    {
        ushort hv, tv;
        foreach (var b in Blocks(file, out hv, out tv))
        {
            if (b.Type == type)
            {
                var data = new byte[b.Size];
                Buffer.BlockCopy(file, (int)b.Offset, data, 0, (int)b.Size);
                return data;
            }
        }
        return null;
    }
}

// Hash de string do Source 2 (MurmurHash2, semente 0x31415926, nome em minúsculas). É o "ability ID" que o
// jogo usa para itens: MurmurHash2("upgrade_close_range") = id do Close Quarters (confere com o deadlock-api).
public static class S2Hash
{
    public static uint Murmur2(string s)
    {
        byte[] d = System.Text.Encoding.UTF8.GetBytes(s.ToLowerInvariant());
        const uint m = 0x5bd1e995;
        int len = d.Length, i = 0;
        uint h = 0x31415926u ^ (uint)len;
        while (len >= 4)
        {
            uint k = (uint)(d[i] | d[i + 1] << 8 | d[i + 2] << 16 | d[i + 3] << 24);
            k *= m; k ^= k >> 24; k *= m;
            h *= m; h ^= k;
            i += 4; len -= 4;
        }
        switch (len)
        {
            case 3: h ^= (uint)d[i + 2] << 16; goto case 2;
            case 2: h ^= (uint)d[i + 1] << 8; goto case 1;
            case 1: h ^= d[i]; h *= m; break;
        }
        h ^= h >> 13; h *= m; h ^= h >> 15;
        return h;
    }
}
